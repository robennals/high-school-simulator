/**
 * What people actually say when they play a card. There are few cards and many lines, and every line
 * follows on from the one before it. A line is an optional lead and a move:
 *
 * - **The move** comes from the card and the subject: what's being talked about, which lasts through
 *   the responses to it, so a tease after soccer talk is about soccer.
 * - **The lead** is there when the move alone wouldn't follow: it answers what you were just asked, or
 *   acknowledges what was said and owns up to changing the subject.
 * - **A response closes an exchange,** so responses never ask questions: nobody would get to answer.
 * - **A line that needs a particular answer carries its replies** (REPLIES).
 *
 * Inside a thread (threads.ts) the words are the thread's own, and the owner's reaction is the answer.
 * A line isn't repeated in a conversation until its pool runs out, and picking one never rolls the
 * world's dice, so words can't change what happens.
 *
 * Placeholders: {name} the person spoken to; {topic}, {is} an opinion's topic and its verb; {hobby};
 * {mine} something the speaker loves; {theirs} something the person spoken to loves; {shirt} what their
 * shirt is about.
 */
import { OPINION_TOPICS, type Ability } from '../sim/content';
import { CALLS_FOR_ANSWER, drawnBy, subjectOf, tempted } from './cards';
import { LEVEL } from './rules';
import { threadWords } from './threads';
import type { Convo, Play, Story, World } from './types';
import { bond } from './world';

/** Cards said to one person, which name them when it wouldn't be clear who's meant. */
const SAID_TO_ONE = new Set(['ask', 'compliment', 'help', 'tease', 'invite']);
/** Questions you can answer by bringing up what you like. */
const WHAT_YOU_LIKE = new Set(['What are you into?', 'What’s new with you?']);

/** A spoken line: the template it came from (for threading), the words, and any immediate answer. */
export interface Spoken {
  speaker: number;
  template: string;
  /** What came before the move: an answer, or owning up to changing the subject. */
  lead?: string;
  /** The templates the lead was picked from (so it isn't repeated). */
  leadTemplates?: string[];
  text: string;
  /** A card settled on the spot (invite, ask out) gets its answer straight away. */
  answer?: { speaker: number; text: string };
}

// ---------------------------------------------------------------- lines that need their own replies

const REPLIES: Record<string, readonly string[]> = {
  // Getting to know someone
  'What are you into?': ['Mostly {mine}. Don’t judge me.', '{mine}, honestly. Way too much.', 'Kind of a lot of things. {mine}, mainly.'],
  'What classes do you have?': ['English first, then math. Pray for me.', 'Mr. Dunn for history, so… yeah.', 'Ms. Okafor for English. The rest is a blur.'],
  'What do you think of this place so far?': ['It’s so much bigger than my old school.', 'It’s okay. I still get lost.', 'Ask me in a month.'],
  'Where did you go before here?': ['One of the middle schools around here. It was way smaller.', 'Somewhere everybody knew everybody. This is different.', 'Just middle school, down the road. It feels like forever ago.'],
  'I keep getting lost here. Is it just me?': ['Nope. I walked into the wrong class yesterday.', 'It’s not just you. These hallways all look the same.', 'I still use the map. Don’t tell anyone.'],
  'I barely know anyone here yet. You?': ['Same. A few people, kind of.', 'Well, you sort of know me now.', 'Not really. It’s a lot of faces.'],
  'How’s your week going?': ['Long. Really long.', 'Pretty good, actually.', 'Kind of a lot, but okay.'],
  'What did you do this weekend?': ['Nothing. It was great.', 'Slept, mostly.', 'Mostly {mine}. The usual.'],
  'Are you doing anything later?': ['Homework, probably. Tragic.', 'Nothing much yet.', 'Just going home, I think.'],
  'Did you finish the homework?': ['Define “finish.”', 'Most of it. The last one made no sense.', 'Last night at like eleven.'],
  'I’m so tired today. How are you awake?': ['I’m not. This is autopilot.', 'Pure spite, honestly.', 'I’m awake in body only.'],
  'Real question: how are you doing?': ['Honestly, better now.', 'Okay, I think. Thanks for actually asking.', 'Kind of stressed, but I’m okay.'],
  'What’s new with you?': ['Not much. Mostly {mine}.', 'Nothing. My life is very boring.', 'Surviving, basically.'],
  // Asking about a shirt
  'You’re into {shirt}?': ['Obsessed. Completely.', 'Ha, yeah. Big fan.', 'Since forever. Don’t judge me.'],
  'I have to ask: are you a big fan of {shirt}?': ['It was a birthday present. Best one ever.', 'I know, I know. I love it.', 'Finally, somebody noticed!'],
  'Where did you even get that shirt?': ['My cousin gave it to me.', 'A thrift store. Three dollars.', 'No idea. It just showed up in my closet.'],
  // Remembering what they like
  'Are you still really into {theirs}?': ['Always. I can’t believe you remembered.', 'Oh yeah. It’s getting worse, if anything.', 'Kind of obsessed, honestly.'],
  'You like {theirs}, right?': ['Love it. So much.', 'Yes! I can’t believe you noticed.', 'Yeah. I guess it’s pretty obvious.'],
  'I thought of you. Anything new with {theirs}?': ['So much. I could go on for an hour.', 'Not really, but thanks for asking.', 'Yes, and I’ve had nobody to tell.'],
  // Following up
  'How did you get into {hobby}?': ['My cousin got me into it, and then I couldn’t stop.', 'By accident, kind of. Then it took over.', 'I’ve just always liked it.'],
  'How long have you been into {hobby}?': ['Since like fifth grade.', 'A couple of years now.', 'Forever. It’s a problem.'],
  'Wait, why {topic}, though?': ['I don’t know, it’s just how I feel.', 'Long story. Trust me on it.', 'Just pay attention for a week. You’ll see.'],
  'Has it gotten any better?': ['A little. Thanks for asking.', 'Some days. Today’s okay.', 'Not yet. But it helps to say it.'],
  'How did you get so good at that?': ['Practice. Like, a lot of practice.', 'I was really bad at first, honestly.', 'No idea. I just kept doing it.'],
  'Are you always this funny?': ['Only on days ending in y.', 'No, you got lucky.', 'It’s mostly nerves, honestly.'],
  'How did you hear about that?': ['Everybody’s talking about it.', 'I can’t say. But it’s legit, I swear.', 'It’s been going around all week.'],
  // Opening up
  'Can I tell you something? I almost didn’t come today.': ['Hey. I’m really glad you did.', 'I’m really sorry it’s been like that.', 'I get that. Some days are hard.'],
  'Honestly, I’ve been kind of lonely since school started.': ['I didn’t know. You can always sit with me.', 'Me too, sometimes. I thought it was just me.', 'That’s really hard. I’m glad you said it.'],
  'My parents have been fighting a lot. I don’t really tell people that.': ['I won’t tell anyone. I’m really sorry.', 'That sounds really hard. I’m sorry.', 'You can talk to me about it whenever.'],
  'I act like I’m fine, but I’m nervous all the time here.': ['I would never have guessed. I get nervous too.', 'You don’t have to act fine with me.', 'Thanks for telling me. Seriously.'],
  'I’m scared I’m going to fail something. I haven’t told anyone.': ['Okay. We can figure it out.', 'That sounds so stressful.', 'I’ve been scared of that too.'],
  'Don’t laugh, but I really miss how things were in middle school.': ['I’m not laughing. I miss it too.', 'Yeah. Everything was smaller.', 'That makes total sense.'],
  // Jokes
  'I’m not saying the cafeteria pizza is bad, but it filed a complaint about itself.': ['Ha! It should win that case.', 'And the milk is its lawyer.', 'Stop, I’m eating it right now.'],
  'Group projects are just one person working while three people watch.': ['Ha! And it’s always the same person.', 'I’m in one right now. Send help.', 'Too real.'],
  'I tried to be early today. The universe said no.': ['Ha, the universe hates first period.', 'Relatable.', 'The universe has a point.'],
  'My backpack weighs more than I do. I work for it now.': ['Ha! I hope it pays well.', 'Mine fired me.', 'Blink twice if you need help.'],
  'I studied for ten whole minutes. I’m basically a professor.': ['Ha, okay, professor.', 'Ten whole minutes. Show-off.', 'I’ll be needing your autograph.'],
  'The Wi-Fi here runs on hopes and dreams.': ['And it’s out of both.', 'Ha! That explains so much.', 'Mostly dreams.'],
};

// ---------------------------------------------------------------- pools, by card and situation

const ASK = {
  shirtFan: ['You’re into {shirt}?', 'I have to ask: are you a big fan of {shirt}?'],
  shirtFunny: ['Where did you even get that shirt?'],
  stranger: ['What are you into?', 'What classes do you have?', 'What do you think of this place so far?', 'Where did you go before here?', 'I keep getting lost here. Is it just me?', 'I barely know anyone here yet. You?'],
  known: ['Are you still really into {theirs}?', 'You like {theirs}, right?', 'I thought of you. Anything new with {theirs}?'],
  acquainted: ['How’s your week going?', 'What did you do this weekend?', 'Are you doing anything later?', 'Did you finish the homework?', 'What’s new with you?', 'What are you into?'],
  friend: ['I’m so tired today. How are you awake?', 'Real question: how are you doing?', 'What did you do this weekend?', 'What’s new with you?', 'How’s your week going?', 'Did you finish the homework?'],
  /** Asking back: it gets the answers of the question it sends back. */
  back: ['What about you?', 'How about you?'],
  afterTalk: ['How did you get into {hobby}?', 'How long have you been into {hobby}?'],
  afterOpinion: ['Wait, why {topic}, though?'],
  afterOpenUp: ['Has it gotten any better?'],
  afterShow: ['How did you get so good at that?'],
  afterJoke: ['Are you always this funny?'],
  afterStory: ['How did you hear about that?'],
};
const CAN_ASK_BACK = new Set([...ASK.stranger, ...ASK.acquainted, ...ASK.friend]);

// Openers that bring something up are statements, so any warm response fits them.
const TALK = {
  open: ['I have been way too into {hobby} lately.', 'I could talk about {hobby} all day.', 'I was up way too late because of {hobby}.'],
  asked: ['Mostly {hobby}, honestly.', 'Honestly, {hobby}. Way too much.', 'Lately it’s all {hobby} for me.'],
  same: ['Same, I’m way too into {hobby}.', 'Nothing beats {hobby}.', 'Finally, someone I can talk {hobby} with.'],
  again: ['Back to {hobby} for a second.', 'Okay, I’m bringing up {hobby} again.', 'I’m not done with {hobby}, sorry.'],
  more: ['Seriously, I could go on about {hobby} forever.', 'And that’s not even the best part of {hobby}.', 'I’m telling you, {hobby} will take over your life.'],
};

const OPINION = {
  love: ['{topic} {is} the best. Not even sorry.', 'I will never get tired of {topic}.', 'I love {topic}. I said what I said.'],
  hate: ['{topic} {is} kind of the worst.', 'I can’t stand {topic}.', '{topic} {is} so overrated.'],
  askedLove: ['Honestly, I’m really into {topic} right now.', 'Mostly I just love {topic}.', '{topic}, for sure.'],
  askedHate: ['Honestly, anything but {topic}.', 'Not {topic}, I’ll tell you that.', 'Mostly trying to avoid {topic}.'],
  sameLove: ['Yes! {topic} {is} so good.', 'Thank you. I love {topic}.', 'Okay, finally. {topic} forever.'],
  sameHate: ['Thank you. {topic} {is} so overrated.', 'For real, I can’t stand {topic}.', 'Finally, someone said it about {topic}.'],
  againstLove: ['No way. I love {topic}.', 'Hard disagree. {topic} {is} great.', 'No way. I will defend {topic}.'],
  againstHate: ['I don’t know, {topic} {is} kind of overrated.', 'See, I can’t stand {topic}.', 'Hmm. I’m not a fan of {topic}, honestly.'],
};

const COMPLIMENT = {
  afterTalk: ['You really know your {hobby} stuff.', 'It’s cool how into {hobby} you are.', 'I wish I knew that much about {hobby}.'],
  afterJoke: ['You’re actually really funny.', 'I don’t know how you come up with this stuff.', 'You should do the morning announcements.'],
  afterShow: ['That’s actually really impressive.', 'Okay, you are good at that.', 'You make it look easy.'],
  afterOpenUp: ['That was really brave to say.', 'For what it’s worth, I think you’re great.', 'I’m glad I know you.'],
  /** Fits after anything they just said. */
  afterThem: ['You’re really easy to talk to.', 'I like talking to you.', 'You’re honestly so nice.'],
  any: ['I like your jacket.', 'You were really good in class today.', 'You always seem like you know what’s going on.', 'Your backpack pins are so cool.', 'That was smart, what you said in class.'],
};

// Each offer says what it's about: nothing to refer back to.
const HELP: Record<Ability, readonly string[]> = {
  athletics: ['I can help you practice for the fitness test, if you want.', 'Want me to show you some tricks for gym?', 'We could shoot hoops before school, if you want to get better.'],
  academics: ['Want me to walk you through the math homework?', 'I have notes from class, if you want them.', 'We could study for the history quiz together.'],
  humor: ['Want help making your English presentation less boring?', 'I can help you write a funny opening for your speech.', 'If you’re nervous about presenting, practice on me.'],
  arts: ['Want help with your art project?', 'I can show you how to do shading for art class.', 'I can help you with the poster for history, if you want.'],
  style: ['Want help picking an outfit for picture day?', 'I could help you customize your backpack.', 'I can help you figure out a costume for spirit week.'],
  tech: ['If your laptop is acting up, I can look at it.', 'Want me to show you some shortcuts for typing class?', 'I can help you fix your phone storage, if it’s full.'],
};

const BRAG: Record<Ability, readonly string[]> = {
  athletics: ['I was the fastest one in gym today, by the way.', 'Sports are kind of my thing.', 'Coach says I could make varsity.'],
  academics: ['I got the highest grade on that quiz, by the way.', 'School stuff is pretty easy for me.', 'I finished the whole packet in class.'],
  humor: ['I made all of third period laugh today.', 'I’m kind of the funny one, usually.', 'People say I should do stand-up.'],
  arts: ['My piece got picked for the display case.', 'Art and music are kind of my thing.', 'Ms. Okafor said my poem was the best in the class.'],
  style: ['Three people asked where I got this outfit.', 'I basically started this whole look.', 'Clothes are kind of my thing.'],
  tech: ['I built that app in a weekend, by the way.', 'People keep asking me to fix their phones.', 'I beat the whole coding unit in two days.'],
};

const JOKE = {
  any: [
    'I’m not saying the cafeteria pizza is bad, but it filed a complaint about itself.',
    'Group projects are just one person working while three people watch.',
    'I tried to be early today. The universe said no.',
    'My backpack weighs more than I do. I work for it now.',
    'I studied for ten whole minutes. I’m basically a professor.',
    'The Wi-Fi here runs on hopes and dreams.',
  ],
  afterOpinion: ['{topic}: my villain origin story.', 'I’m starting a support group for people with feelings about {topic}.', 'Please, not {topic} again. I only have so much heart.'],
  afterTalk: ['Everything I know about {hobby}, I learned in the last thirty seconds.', 'If there were a class on {hobby}, I’d finally have an A.', 'I nodded like I understand {hobby}. Please clap.'],
  /** Joke answers: fine for any question. */
  afterAsk: ['That’s classified.', 'I can neither confirm nor deny that.', 'I’ll have my lawyer get back to you.'],
};

// Responses close the exchange: no questions here.
const RESPOND = {
  ask: ['Yeah, pretty much.', 'Ha, yeah. Kind of.', 'I think so, yeah.'],
  compliment: ['Oh, thanks!', 'Stop. Thank you.', 'Ha, thanks. That’s nice of you.', 'Aw, thanks.'],
  talkInto: ['Same. I love {hobby}.', 'Okay, finally someone else who gets {hobby}.', 'Me too! I can’t get enough.'],
  talkCurious: ['I don’t really know {hobby}, but it sounds fun.', 'Ha, you’re really into it. That’s cool.', 'I should try getting into {hobby}.'],
  agreeLove: ['Same. {topic} {is} so good.', 'For real. Love it.', 'Yes. Thank you for saying that.'],
  agreeHate: ['For real. So overrated.', 'Same. I can’t stand {topic}.', 'Thank you for saying that.'],
  goAlong: ['Oh, yeah. Totally.', 'Ha, yeah, I guess so.', 'Mm, yeah, for sure.'],
  joke: ['Hahaha, stop.', 'Okay, that’s good.', 'Ha! I can’t breathe.'],
  tease: ['Ha, okay, fair.', 'Rude. But accurate.', 'Wow. I see how it is.', 'Ha, I know, I know.'],
  brag: ['No way. That’s cool.', 'Okay, that’s impressive.', 'Dang. Nice.'],
  helpMe: ['Oh, that would be amazing. Thanks.', 'Yes, please. You’re a lifesaver.', 'That’d be great. Thank you.'],
  helpOther: ['That’s really nice of you.', 'You’re good at that stuff.', 'You’re always helping people. I like that.'],
  comfort: ['I’m really glad you told me.', 'That sounds so hard.', 'I’m here if you want to talk more.', 'I won’t tell anyone. Promise.'],
  confide: ['Thanks. I don’t really tell people this stuff.', 'It helps just saying it out loud.', 'Thanks for not making it weird.', 'Yeah. I think I just needed someone to know.'],
  storyMean: ['That’s so messed up.', 'Wow, that’s really mean.', 'Wow. I had no idea they were like that.'],
  storyMine: ['I can’t believe that happened to you. I’m so sorry.', 'That’s awful. I’m sorry.', 'That is not okay. I’m sorry.'],
  storyRumor: ['Hmm. I don’t know if I believe that.', 'That might just be a rumor, though.', 'I don’t know, that doesn’t sound like them.'],
  storyNews: ['No way!', 'Wow, I did not see that coming.', 'I had no idea!'],
};

const TEASE = {
  shirtFan: ['You actually wore a {shirt} shirt. In public.', 'Bold of you to advertise {shirt}.', 'Nobody needed to know you like {shirt}.'],
  shirtFunny: ['Nice shirt. I’m guessing you lost a bet.', 'That shirt says you got dressed in the dark.', 'That shirt is trying so hard.'],
  back: ['Says you.', 'Look who’s talking.', 'Big words from someone with ketchup on their sleeve.'],
  afterBrag: ['Wow. Humble, too.', 'Okay, we get it.', 'Somebody get this person a trophy.'],
  /** They brought up the hobby. */
  afterTalk: ['Okay, {hobby} nerd.', 'You could talk about {hobby} in your sleep.', 'Here comes the {hobby} lecture.'],
  /** The hobby is the subject, and they've been going along with it. */
  aboutTalk: ['Don’t act like you know anything about {hobby}.', 'You’d last five minutes at {hobby}, tops.', 'Careful, you’re turning into a {hobby} nerd.'],
  afterOpinion: ['Of course you’d say that about {topic}.', 'Wow. {topic}. Hot take.', 'Very controversial, {name}.'],
  aboutOpinion: ['Like you know anything about {topic}.', 'You just like having opinions about {topic}.', 'Careful, or you’ll be president of the {topic} debate club.'],
  afterJoke: ['I bet you wrote that one down first.', 'You’ve been saving that one all day.', 'Don’t quit your day job.'],
  afterOpenUp: ['Okay, don’t get all mushy on me. Kidding. I’m glad you said it.', 'You big softie.', 'Look at you, having feelings. I respect it.'],
  afterStory: ['You live for drama.', 'You should have your own news channel.', 'Nothing gets past you, detective.'],
  /** Fit after anything. */
  friendly: ['You are so weird. I mean that nicely.', 'You’re ridiculous, and you know it.', 'You’re lucky I like you.'],
  unfriendly: ['Wow. Fascinating.', 'Okay, genius.', 'Cool story. Really.'],
};

const PUTDOWN = {
  afterOpenUp: ['Wow. Nobody asked for your life story.', 'Okay, way too much information.', 'This is why nobody talks to you.'],
  afterOpinion: ['Nobody cares what you think about {topic}.', 'Only you would think that.', 'And that’s why we don’t ask you.'],
  afterTalk: ['Literally nobody cares about {hobby}.', 'No wonder you sit alone.', 'You know that’s embarrassing, right?'],
  afterJoke: ['That wasn’t funny. You’re not funny.', 'Nobody’s laughing with you.', 'Please stop trying.'],
  afterBrag: ['You’re not even good at it.', 'Everybody laughs about that behind your back.', 'Nobody believes you.'],
  any: ['Why are you even sitting here?', 'Nobody asked you, {name}.', 'Do you ever stop talking?', 'You’re so embarrassing.', 'Who invited {name}?'],
};

const STANDUP = {
  forMe: ['Don’t talk to me like that.', 'That’s not funny, and you know it.', 'Say what you want. I’m staying right here.'],
  forThem: ['Hey. Leave them alone.', 'Not cool, {name}. At all.', 'Why would you say that to them?', 'Knock it off, {name}.'],
  later: ['I heard what you did. That was messed up.', 'People know what you did, {name}. It wasn’t okay.', 'You can’t just treat people like that, {name}.'],
  forMeLater: ['I haven’t forgotten what you said to me.', 'What you did to me wasn’t okay, {name}.', 'You don’t get to act like nothing happened.'],
};

const OPEN_UP = ['Can I tell you something? I almost didn’t come today.', 'Honestly, I’ve been kind of lonely since school started.', 'My parents have been fighting a lot. I don’t really tell people that.', 'I act like I’m fine, but I’m nervous all the time here.', 'I’m scared I’m going to fail something. I haven’t told anyone.', 'Don’t laugh, but I really miss how things were in middle school.'];

const INVITE = {
  afterOpenUp: ['Want to hang out after school? Might take your mind off it.', 'Come over later, if you feel like it.'],
  afterTalk: ['We should do {hobby} stuff after school, if you want.', 'Come over later and we can do {hobby} stuff. No pressure.'],
  any: ['Want to hang out after school, if you’re not busy?', 'We could do something later. No pressure.', 'I might get fries after school, if you want to come.'],
  yes: ['Yeah, sure!', 'Okay, I’m in.', 'Yes, please. Anything but homework.'],
  no: ['Oh, I can’t today. Sorry!', 'Maybe another time?', 'I have a thing. But thanks.'],
};

const ASK_OUT = {
  ask: ['So, um… do you want to go out with me?', 'I like you. Would you want to go out sometime?', 'Okay, I’m just going to say it. Will you go out with me?'],
  yes: ['Wait, really? Yes.', 'I was hoping you’d ask.', 'Yeah. I’d like that.'],
  no: ['Oh. I’m sorry, I don’t really think of you like that.', 'That’s really nice, but… no. Sorry.', 'I think we’re better as friends.'],
};

const BREAK_UP = ['I don’t think we should go out anymore.', 'This isn’t really working, is it? I’m sorry.', 'I think I need to just be me for a while.'];

/** How a story gets started, before the story itself. */
const TELL = ['Don’t say I told you, but', 'So apparently,', 'You didn’t hear this from me, but', 'Everyone’s saying'];
const TELL_MINE = ['I need to tell you what happened.', 'You should know something.', 'I have to tell somebody this.'];

// ---------------------------------------------------------------- leads

/** Taking in what was just said, before saying something else. */
const ACK = {
  talk: ['Ha, nice.', 'That’s cool.', 'Sounds fun.'],
  opinion: ['Ha, okay.', 'Fair enough.', 'Noted.'],
  joked: ['Ha!', 'Okay, that was good.', 'Hahaha.'],
  flopped: ['…Okay.', 'Wow. Okay.', 'Yikes, that joke.'],
  brag: ['Cool.', 'Okay, nice.', 'Good for you.'],
  story: ['Yikes.', 'Huh. Wow.', 'Okay, wow.'],
  teasedMean: ['Wow, okay.', 'Thanks a lot.', 'Whatever.'],
  openup: ['I’m glad you said that.', 'That’s a lot. I’m sorry.', 'Thanks for telling us.'],
  tense: ['Um. Okay.', 'Well, that was awkward.', 'Yikes. Okay.'],
};

/** Owning up to changing the subject. */
const BRIDGE = {
  any: ['Anyway,', 'Okay, random, but', 'Totally different thing:', 'Oh, also,', 'Before I forget,', 'Okay, new subject:', 'Not to change the subject, but', 'So, um,'],
  question: ['So,', 'Oh, also,', 'Random question:', 'Anyway,', 'Before I forget,'],
  serious: ['Okay, serious for a second.', 'This is kind of random, but', 'Um, so.'],
  alsoSerious: ['Since we’re being honest,', 'While we’re saying stuff like this,'],
  lighter: ['On a lighter note,', 'Okay, to cheer us up:', 'Um, on a happier note,'],
  toGossip: ['Oh my gosh.', 'Oh! I forgot to tell you.', 'Wait, this is big.'],
  gossip: ['Speaking of drama:', 'That’s not even all.', 'Oh, it gets worse.'],
};

/** Made-up stories: the same words each time that rumor is told. Mean, but mild. */
const RUMORS = ['copies homework off everybody', 'talks about all their friends behind their backs', 'got kicked out of their last club', 'lies about everything', 'still needs their mom to wake them up for school'];

// ---------------------------------------------------------------- choosing a line

const PLURAL_TOPICS = new Set(['the Starfall movies', 'pep rallies']);

function hash(...xs: number[]): number {
  let h = 2166136261;
  for (const x of xs) h = Math.imul(h ^ (x + 1009), 16777619);
  return (h ^ (h >>> 13)) >>> 0;
}

function firstName(w: World, id: number): string {
  return w.people[id].name.split(' ')[0];
}

function sentenceCase(s: string): string {
  return s.replace(/(^|[.?!] )([a-z])/g, (_, before: string, letter: string) => before + letter.toUpperCase());
}

/** Something they love, to name: their biggest hobby, else something they love. */
function favorite(w: World, id: number): string | null {
  const p = w.people[id];
  const hobby = [...p.interests].sort((a, b) => b[1] - a[1])[0];
  if (hobby) return hobby[0];
  const topic = p.opinions.indexOf(2);
  return topic >= 0 ? OPINION_TOPICS[topic] : null;
}

function shirtSubject(w: World, id: number): string | null {
  const { style, topic } = w.people[id].shirt;
  if (style !== 'fan' || topic === null) return null;
  return topic === 0 ? 'the school team' : OPINION_TOPICS[topic];
}

/** What a story says, as `teller` would tell it. Full names: a school has more than one Marco. */
function storyText(w: World, s: Story, teller: number): string {
  const who = w.people[s.actor].name;
  const whom = s.target === teller ? 'me' : s.target >= 0 ? w.people[s.target].name : '';
  const told = hash(s.id, teller) % 3;
  switch (s.kind) {
    case 'putdown':
      return [`${who} totally humiliated ${whom} in front of everyone.`, `${who} went after ${whom} for no reason.`, `${who} was super mean to ${whom}, like, in public.`][told];
    case 'leaveout':
      return `${who} wouldn’t let ${whom} sit with them.`;
    case 'couple':
      return `${who} and ${whom} are going out.`;
    case 'breakup':
      return `${who} and ${whom} broke up.`;
    case 'turneddown':
      return `${who} asked ${whom} out and got turned down.`;
    case 'lied':
      return [`${who} was spreading a lie about ${whom}.`, `${who} made up that whole thing about ${whom}.`, `${who} totally made up that rumor about ${whom}.`][told];
    case 'rumor':
      return `${who} ${RUMORS[hash(s.actor, s.day) % RUMORS.length]}.`;
  }
}

/** A card's lines here, and whether they follow on by themselves from what was just said. */
interface Move {
  pool: readonly string[];
  follows: boolean;
}
const follows = (pool: readonly string[]): Move => ({ pool, follows: true });
const changes = (pool: readonly string[]): Move => ({ pool, follows: false });

/** The answers that suit the question or line at `i`. */
function repliesTo(said: readonly Spoken[], i: number): readonly string[] | undefined {
  let at = i;
  while (at > 0 && ASK.back.includes(said[at]?.template)) at--; // "What about you?" is the question before it
  return REPLIES[said[at]?.template ?? ''];
}

/** What a card says, given the subject. */
function moveFor(w: World, before: readonly Play[], said: readonly Spoken[], p: Play): Move {
  const prev = before.at(-1);
  const subject = subjectOf(before);
  // The subject, if the person spoken to is the one who brought it up.
  const theirs = subject && subject.actor === p.target ? subject : undefined;
  const askedMe = prev?.card === 'ask' && prev.target === p.actor;
  const askedWhatILike = askedMe && WHAT_YOU_LIKE.has(said[before.length - 1]?.template ?? '');
  const me = w.people[p.actor];
  // A thread's words are its own; only starting one can need a lead.
  if (p.thread) return { pool: [threadWords(p.thread).line], follows: p.card === 'respond' };
  switch (p.card) {
    case 'ask': {
      if (askedMe && prev.actor === p.target && CAN_ASK_BACK.has(said[before.length - 1]?.template ?? '')) return follows(ASK.back);
      // A follow-up, once: after that it's a new question.
      const followUp =
        theirs?.card === 'talk' ? ASK.afterTalk
        : theirs?.card === 'opinion' ? ASK.afterOpinion
        : theirs?.card === 'openup' ? ASK.afterOpenUp
        : theirs?.card === 'brag' ? ASK.afterShow
        : theirs?.card === 'joke' && theirs.success ? ASK.afterJoke
        : theirs?.card === 'story' ? ASK.afterStory
        : null;
      if (followUp?.some((t) => !said.some((s) => s.template === t))) return follows(followUp);
      // Their shirt, or what you know they love, is an opener: the first thing you ask them, and nobody
      // asks them about it twice in a conversation.
      const askedBefore = before.some((b) => b.card === 'ask' && b.actor === p.actor && b.target === p.target);
      const alreadyAsked = (pool: readonly string[]) => before.some((b, i) => b.card === 'ask' && b.target === p.target && pool.includes(said[i].template));
      const shirt = shirtSubject(w, p.target) ? ASK.shirtFan : ASK.shirtFunny;
      if (!askedBefore && drawnBy(w, p.actor, p.target) && !alreadyAsked(shirt)) return changes(shirt);
      if (!askedBefore && w.knows[p.actor * w.n + p.target] && favorite(w, p.target) && !alreadyAsked(ASK.known)) return changes(ASK.known);
      const b = bond(w, p.actor, p.target);
      const questions = b >= LEVEL.friends ? ASK.friend : b >= LEVEL.friendly ? ASK.acquainted : ASK.stranger;
      // Don't ask what someone's into when they've just been telling you.
      const toldUs = before.some((x) => x.card === 'talk' && x.actor === p.target);
      return changes(toldUs ? questions.filter((q) => !WHAT_YOU_LIKE.has(q)) : questions);
    }
    case 'talk':
      if (subject?.card === 'talk' && subject.interest === p.interest) return follows(subject.actor === p.actor ? TALK.more : TALK.same);
      if (before.some((b) => b.card === 'talk' && b.interest === p.interest))
        return subject?.card === 'openup' ? changes(TALK.again) : follows(TALK.again);
      return askedWhatILike ? follows(TALK.asked) : changes(TALK.open);
    case 'opinion': {
      const loves = p.stance! > 0;
      if (subject?.card === 'opinion' && subject.topic === p.topic && subject.actor !== p.actor) {
        if (Math.sign(subject.stance!) === Math.sign(p.stance!)) return follows(loves ? OPINION.sameLove : OPINION.sameHate);
        return follows(loves ? OPINION.againstLove : OPINION.againstHate);
      }
      if (askedWhatILike) return follows(loves ? OPINION.askedLove : OPINION.askedHate);
      return changes(loves ? OPINION.love : OPINION.hate);
    }
    case 'compliment':
      if (theirs?.card === 'talk') return follows(COMPLIMENT.afterTalk);
      if (theirs?.card === 'joke' && theirs.success) return follows(COMPLIMENT.afterJoke);
      if (theirs?.card === 'brag' || theirs?.card === 'help') return follows(COMPLIMENT.afterShow);
      if (theirs?.card === 'openup') return follows(COMPLIMENT.afterOpenUp);
      return prev && prev.actor === p.target ? follows(COMPLIMENT.afterThem) : changes(COMPLIMENT.any);
    case 'help':
      return changes(HELP[p.ability!]);
    case 'brag':
      return changes(BRAG[p.ability!]);
    case 'joke':
      if (askedMe) return follows(JOKE.afterAsk);
      if (subject?.card === 'opinion') return follows(JOKE.afterOpinion);
      if (subject?.card === 'talk') return follows(JOKE.afterTalk);
      return changes(JOKE.any);
    case 'respond':
      return follows(responseTo(w, before, said, p));
    case 'tease':
      if (prev?.card === 'tease' && prev.target === p.actor) return follows(TEASE.back);
      if (theirs?.card === 'brag') return follows(TEASE.afterBrag);
      if (theirs?.card === 'joke') return follows(TEASE.afterJoke);
      if (theirs?.card === 'story') return follows(TEASE.afterStory);
      if (theirs?.card === 'openup' && p.success) return follows(TEASE.afterOpenUp);
      if (subject?.card === 'talk') return follows(theirs ? TEASE.afterTalk : TEASE.aboutTalk);
      if (subject?.card === 'opinion') return follows(theirs ? TEASE.afterOpinion : TEASE.aboutOpinion);
      if (!p.success && tempted(w, p.actor, p.target)) return changes(shirtSubject(w, p.target) ? TEASE.shirtFan : TEASE.shirtFunny);
      return follows(p.success ? TEASE.friendly : TEASE.unfriendly);
    case 'putdown':
      if (theirs?.card === 'openup') return follows(PUTDOWN.afterOpenUp);
      if (theirs?.card === 'opinion') return follows(PUTDOWN.afterOpinion);
      if (theirs?.card === 'talk') return follows(PUTDOWN.afterTalk);
      if (theirs?.card === 'joke') return follows(PUTDOWN.afterJoke);
      if (theirs?.card === 'brag') return follows(PUTDOWN.afterBrag);
      return follows(PUTDOWN.any);
    case 'standup': {
      if (prev?.card === 'putdown' && prev.actor === p.target) return follows(prev.target === p.actor ? STANDUP.forMe : STANDUP.forThem);
      const wasMe = [...me.stories].some((id) => w.stories[id]?.mean && w.stories[id].actor === p.target && w.stories[id].target === p.actor);
      return follows(wasMe ? STANDUP.forMeLater : STANDUP.later);
    }
    case 'openup':
      return changes(OPEN_UP);
    case 'invite':
      if (subject?.card === 'openup') return follows(INVITE.afterOpenUp);
      if (subject?.card === 'talk') return follows(INVITE.afterTalk);
      return changes(INVITE.any);
    case 'askout':
      return follows(ASK_OUT.ask);
    case 'breakup':
      return follows(BREAK_UP);
    case 'story':
      return changes(w.stories[p.storyId!].target === p.actor ? TELL_MINE : TELL);
    case 'rumor':
      return changes(TELL);
    default:
      throw new Error(`no lines for the ${p.card} card`);
  }
}

/** The responses that fit what was just said. */
function responseTo(w: World, before: readonly Play[], said: readonly Spoken[], p: Play): readonly string[] {
  const prev = before.at(-1);
  if (!prev) return RESPOND.ask;
  const me = w.people[p.actor];
  const replies = repliesTo(said, before.length - 1);
  switch (prev.card) {
    case 'ask':
      return replies ?? RESPOND.ask;
    case 'compliment':
      return RESPOND.compliment;
    case 'talk':
      return me.interests.has(prev.interest!) ? RESPOND.talkInto : RESPOND.talkCurious;
    case 'opinion':
      if (me.opinions[prev.topic!] * prev.stance! <= 0) return RESPOND.goAlong;
      return prev.stance! > 0 ? RESPOND.agreeLove : RESPOND.agreeHate;
    case 'joke':
      return replies ?? RESPOND.joke;
    case 'tease':
      return RESPOND.tease;
    case 'brag':
      return RESPOND.brag;
    case 'help':
      return prev.target === p.actor ? RESPOND.helpMe : RESPOND.helpOther;
    case 'openup':
      return replies ?? RESPOND.comfort;
    case 'story': {
      const s = w.stories[prev.storyId!];
      if (!s.true) return RESPOND.storyRumor;
      if (s.target === prev.actor && s.mean) return RESPOND.storyMine;
      return s.mean ? RESPOND.storyMean : RESPOND.storyNews;
    }
    default:
      // Answering back, having opened up.
      return RESPOND.confide;
  }
}

/** The pools a lead is picked from, in order: an answer or acknowledgement, then a change of subject. */
function leadsFor(w: World, before: readonly Play[], said: readonly Spoken[], p: Play, move: Move): (readonly string[])[] {
  const prev = before.at(-1);
  if (!prev || p.card === 'respond') return [];
  const out: (readonly string[])[] = [];
  const toMe = prev.target === p.actor && CALLS_FOR_ANSWER.has(prev.card);
  const t = prev.thread?.move === 'on' ? prev.thread : undefined;
  if (t && t.turn % 2 !== 0 && t.owner === p.actor) {
    // Asked in a thread, then doing something else: answer first.
    out.push([threadWords({ ...t, turn: t.turn + 1 }).line]);
  } else if (t && t.turn >= 2 && t.turn < 6 && t.friend === p.actor && !move.follows) {
    out.push(ACK.openup);
  } else if (toMe) {
    // Spoken to, so that gets answered first (unless the move is the answer).
    const isAnswer =
      (prev.card === 'ask' && [TALK.asked, OPINION.askedLove, OPINION.askedHate, JOKE.afterAsk].some((pool) => pool === move.pool)) ||
      (prev.card === 'tease' && move.pool === TEASE.back);
    if (!isAnswer) out.push(prev.card === 'tease' && !prev.success ? ACK.teasedMean : responseTo(w, before, said, p));
  } else if (!move.follows && prev.actor !== p.actor) {
    if (prev.card === 'talk') out.push(ACK.talk);
    else if (prev.card === 'opinion') out.push(ACK.opinion);
    else if (prev.card === 'joke') out.push(prev.success ? ACK.joked : ACK.flopped);
    else if (prev.card === 'brag') out.push(ACK.brag);
    else if (prev.card === 'story' || prev.card === 'rumor') out.push(ACK.story);
    else if (prev.card === 'openup') out.push(ACK.openup);
    else if (['putdown', 'standup', 'breakup', 'askout'].includes(prev.card)) out.push(ACK.tense);
  }
  if (move.follows) return out;
  const subject = subjectOf(before);
  const wasSerious = subject?.card === 'openup';
  if (p.card === 'openup') out.push(wasSerious ? BRIDGE.alsoSerious : BRIDGE.serious);
  else if ((p.card === 'story' || p.card === 'rumor') && (subject?.card === 'story' || subject?.card === 'rumor')) out.push(BRIDGE.gossip);
  else if (p.card === 'story' || p.card === 'rumor') {
    if (move.pool !== TELL_MINE) out.push(BRIDGE.toGossip); // "you should know something" is its own opener
  }
  else if (wasSerious && ['talk', 'opinion', 'joke', 'brag'].includes(p.card)) out.push(BRIDGE.lighter);
  else out.push(p.card === 'ask' ? BRIDGE.question : BRIDGE.any);
  return out;
}

/** Pick from a pool: the first one not yet used in this conversation, starting from a place set by who and when. */
function pick(pool: readonly string[], used: ReadonlySet<string>, seed: number): string {
  const start = seed % pool.length;
  const inOrder = pool.map((_, i) => pool[(start + i) % pool.length]);
  return inOrder.find((t) => !used.has(t)) ?? inOrder[0];
}

/** Put words after others: lower case after a comma or mid-sentence, unless they start with a name or "I". */
function followedBy(first: string, next: string, nextTemplate: string): string {
  const midSentence = !/[.!?…]$/.test(first);
  const keepsCapital = /^(I\b|Mr\.|Ms\.|English|\{)/.test(nextTemplate);
  return `${first} ${midSentence && !keepsCapital ? next[0].toLowerCase() + next.slice(1) : next}`;
}

/**
 * What someone says in playing `p`, after the plays `before` (which were said as `said`). Works for a
 * card that has been played, or one being considered.
 */
export function phrase(w: World, c: Convo, before: readonly Play[], said: readonly Spoken[], p: Play): Spoken {
  const prev = before.at(-1);
  const subject = subjectOf(before);
  const seed = hash(w.day, p.actor, p.target, before.length);
  const move = moveFor(w, before, said, p);
  const used = new Set(said.flatMap((s) => [s.template, ...(s.leadTemplates ?? [])]));
  const template = pick(move.pool, used, seed);
  used.add(template);
  const leadTemplates = leadsFor(w, before, said, p, move).map((pool) => pick(pool, used, seed));

  const name = p.target >= 0 ? firstName(w, p.target) : null;
  const values = (about: Play | undefined): Record<string, string | null | undefined> => {
    const topic = about?.topic;
    return {
      name,
      topic: topic === undefined ? null : OPINION_TOPICS[topic],
      is: topic !== undefined && PLURAL_TOPICS.has(OPINION_TOPICS[topic]) ? 'are' : 'is',
      hobby: about?.interest,
      mine: favorite(w, p.actor),
      theirs: p.target >= 0 ? favorite(w, p.target) : null,
      shirt: p.target >= 0 ? shirtSubject(w, p.target) : null,
    };
  };
  const fill = (line: string, about: Play | undefined) => {
    const v = values(about);
    return line.replace(/\{(\w+)\}/g, (hole, key: string) => v[key] ?? hole);
  };
  // A move is about its own topic, or the subject; a lead is about what was just said.
  let words = fill(template, p.topic !== undefined || p.interest !== undefined ? p : subject);
  if (p.card === 'story') {
    const told = storyText(w, w.stories[p.storyId!], p.actor);
    // The same news twice over: they've heard it too.
    words = said.some((s) => s.text.toLowerCase().includes(told.toLowerCase())) ? 'Yeah, I heard that too.' : followedBy(words, told, '{story}');
  }
  if (p.card === 'rumor') words = followedBy(words, storyText(w, { id: -1, kind: 'rumor', actor: p.target, target: -1, day: w.day, true: false, mean: true }, p.actor), '{story}');
  let start = template;
  // At a table, say who you mean, unless you're answering them or have just named them.
  if (name && c.members.length > 2 && SAID_TO_ONE.has(p.card) && prev?.actor !== p.target && !template.includes('{name}')) {
    words = followedBy(`${name},`, words, template);
    start = '{name}';
  }
  const leads = leadTemplates.map((t) => fill(t, prev));
  for (let i = leads.length - 1; i >= 0; i--) {
    words = followedBy(leads[i], words, start);
    start = leadTemplates[i];
  }
  const spoken: Spoken = { speaker: p.actor, template, text: sentenceCase(words) };
  if (leads.length) {
    spoken.lead = leads.join(' ');
    spoken.leadTemplates = leadTemplates;
  }
  if (p.thread) {
    const { reaction } = threadWords(p.thread);
    if (reaction) spoken.answer = { speaker: p.thread.owner, text: reaction };
  }
  const replies = p.card === 'invite' ? INVITE : p.card === 'askout' ? ASK_OUT : null;
  if (replies) spoken.answer = { speaker: p.target, text: pick(p.success ? replies.yes : replies.no, used, seed) };
  return spoken;
}

/** A whole conversation, in words. */
export function transcript(w: World, c: Convo): Spoken[] {
  const said: Spoken[] = [];
  c.plays.forEach((p, i) => said.push(phrase(w, c, c.plays.slice(0, i), said, p)));
  return said;
}
