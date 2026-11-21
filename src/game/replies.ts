/**
 * The sentence graph: for a specific line, the lines that make sense as a reply to it, by the kind
 * of card the reply is played as. "My weekend was kind of a disaster" → (Really listen) "Oh no. What
 * happened?" → (Share) "My little brother broke my phone. Again."
 *
 * Replies are lines too, and many have replies of their own, so a conversation can follow a thread.
 * When a line has no reply listed for the card being played, the game falls back to the looser
 * graph in cards.ts, which picks by the kind of line being answered (a question, an opinion, a joke…).
 *
 * Placeholders: {p} the topic and {q} the hobby of the line being answered; {b} the skill it bragged
 * about. The keys are the lines exactly as written in cards.ts (before placeholders are filled).
 */
import type { ActKind } from '../sim/types';

type Replies = Partial<Record<ActKind, string[]>>;

const SHARE_ALONE: Replies = {
  listen: ['Wait, where did you go before?', 'How come?'],
  share: ['Me neither, honestly. It’s a big school.'],
  compliment: ['Well, you know me now.'],
  invite: ['You should hang out with us after school.'],
  agree: ['Yeah, it’s a lot of new faces.'],
  putdown: ['Yeah, I can see why.'],
};

const NERVOUS: Replies = {
  listen: ['Really? You seem so chill.', 'Nervous about what?'],
  share: ['Same. I didn’t sleep at all the night before.'],
  compliment: ['You’re doing fine, for what it’s worth.'],
  agree: ['Honestly, same.'],
  tease: ['You? Nervous? Sure.'],
  putdown: ['Yeah, it shows.'],
};

export const REPLIES: Record<string, Replies> = {
  // ---- questions
  'So what are you into?': {
    share: ['Honestly? Mostly just trying to survive freshman year.', 'Kind of a lot of things. What about you?'],
    joke: ['Professionally? Napping.'],
    agree: ['Ha. Good question.'],
  },
  'How’s your week going?': {
    share: ['Honestly? Kind of a lot.', 'Pretty good, actually. Yours?', 'Long. Really long.'],
    joke: ['Well, I haven’t cried in the bathroom yet, so: great.'],
    agree: ['Ha. It’s going.'],
  },
  'What do you think of this place so far?': {
    share: ['It’s so much bigger than my old school.', 'Honestly? I don’t really know anyone yet.'],
    joke: ['The cafeteria pizza is a crime, but otherwise okay.'],
    agree: ['Ha. Ask me in a month.'],
  },
  'Wait, what classes do you have?': {
    share: ['English first, then math. You?', 'I’ve got Mr. Dunn for history. Pray for me.'],
    joke: ['Too many. That’s my answer.'],
  },
  'Are you doing anything after school?': {
    share: ['Probably just going home. Why?', 'Not really. You?'],
    invite: ['Nothing yet — want to hang out?'],
  },
  'What did you end up doing this weekend?': {
    share: ['Nothing, honestly. It was great.', 'My weekend was kind of a disaster, ngl.'],
    joke: ['Slept. Professionally.'],
  },
  'Are you doing okay with all that?': {
    share: ['Yeah. It helps to talk about it, honestly.', 'Kind of? It’s getting better.'],
    agree: ['Yeah, I’ll be fine. Thanks for asking.'],
  },
  'Has it gotten any better?': {
    share: ['A little. Thanks for asking.'],
    agree: ['Yeah, slowly.'],
  },
  'Okay, you’re funny. What else are you into?': {
    share: ['Ha, thanks. Mostly just hanging out, honestly.'],
    agree: ['Ha. That’s the main thing, honestly.'],
  },
  'Pretty good, I think. What about you?': {
    share: ['Honestly? Kind of a lot.', 'Pretty good, actually.'],
    agree: ['Same, pretty good.'],
  },
  'Kind of a lot of things. What about you?': {
    share: ['Honestly? I’m still figuring that out.'],
  },
  'Pretty good, actually. Yours?': {
    share: ['Kind of a lot, honestly.', 'Better now that it’s lunch.'],
    agree: ['Same, honestly.'],
  },
  'English first, then math. You?': {
    share: ['Same! Wait — are you in Ms. Okafor’s English?'],
    agree: ['Oh nice, same.'],
  },
  'Probably just going home. Why?': {
    invite: ['A few of us might hang out — want to come?'],
    share: ['No reason. I don’t really know what people do around here yet.'],
  },

  // ---- sharing
  'Honestly I was kind of nervous starting here.': NERVOUS,
  'Kind of nervous, if I’m honest.': NERVOUS,
  'Same. I was really nervous the first day too.': { agree: ['Right? I thought everyone could tell.'], share: ['I almost turned around at the front doors.'] },
  'I don’t really know anyone yet.': SHARE_ALONE,
  'Honestly? I don’t really know anyone yet.': SHARE_ALONE,
  'My weekend was kind of a disaster, ngl.': {
    listen: ['Oh no. What happened?'],
    agree: ['Ugh. Those weekends.'],
    joke: ['Cafeteria-pizza level of disaster?'],
    share: ['Mine too, honestly.'],
  },
  'Oh no. What happened?': {
    share: ['My little brother broke my phone. Again.', 'Long story. Family stuff.'],
    joke: ['Let’s just say a goat was involved.'],
  },
  'My little brother broke my phone. Again.': {
    agree: ['Little brothers. Ugh.'],
    listen: ['Wait, again? How?'],
    joke: ['At least now you have an excuse not to text anyone.'],
  },
  'Can I tell you something? I almost didn’t come today.': {
    listen: ['Hey — are you okay?'],
    share: ['I get that. Some days are hard.'],
    compliment: ['I’m glad you did, though.'],
  },
  'Honestly? Kind of a lot.': { listen: ['A lot how?'], agree: ['Yeah, same.'], help: ['Anything I can help with?'] },
  'It’s been kind of a lot, but okay.': { listen: ['A lot how?'], agree: ['Yeah, same.'] },
  'Long. Really long.': { agree: ['Same. It’s only Monday, somehow.'], joke: ['Every week is a month here.'] },
  'Honestly? Mostly just trying to survive freshman year.': { agree: ['Ha. Same.'], listen: ['Is it that bad?'] },
  'It’s so much bigger than my old school.': { listen: ['Where did you go before?'], share: ['Same. I still get lost.'], agree: ['Right? So many people.'] },
  'I’ve got Mr. Dunn for history. Pray for me.': { agree: ['Oof. Good luck.'], joke: ['Mr. Dunn’s tests are like horror movies: you know something’s coming and it’s still awful.'] },

  // ---- following up
  'Wait, then what happened?': { share: ['Honestly, it kind of fizzled out.', 'Then it got worse, obviously.'] },
  'Wait, really? What happened?': { share: ['It’s a long story. Kind of a family thing.', 'I just had a really bad week.'] },
  'That sounds rough. Are you okay?': { share: ['Yeah, I’m okay. Thanks for asking.'], agree: ['Yeah. It helps to say it out loud.'] },
  'Huh — tell me more.': { share: ['Honestly, there’s not that much more to it.'] },
  'Wait, how did you do that?': { brag: ['Practice. Like, a lot of practice.'], share: ['Honestly? I just got lucky.'] },
  'Okay, how?': { brag: ['Practice. Like, a lot of practice.'], share: ['Honestly? I just got lucky.'] },
  'Hey — are you okay?': { share: ['Yeah. I just needed someone to say that.'] },
  'Wait, where did you go before?': { share: ['A really small school. Like, forty people.'] },
  'Where did you go before?': { share: ['A really small school. Like, forty people.'] },
  'A really small school. Like, forty people.': { listen: ['Whoa. This must be wild for you.'], joke: ['There are forty people in this hallway.'] },

  // ---- jokes
  'I’m not saying the cafeteria pizza is bad, but it filed a complaint about itself.': {
    agree: ['Hahaha. It really did.', 'Okay, that’s accurate.'],
    joke: ['And the milk is in on it.'],
    tease: ['Did you come up with that in the shower?'],
    listen: ['Wait, have you actually tried it?'],
  },
  'Mr. Dunn’s tests are like horror movies: you know something’s coming and it’s still awful.': {
    agree: ['Ha! The suspense is the worst part.'],
    share: ['I have his test Friday. I’m doomed.'],
    tease: ['Maybe study, then?'],
  },
  'I tried to be early today. The universe said no.': { agree: ['Relatable.'], tease: ['You were late yesterday too, though.'] },
  'Group projects are just one person doing everything with an audience.': {
    agree: ['And it’s always you, isn’t it.'],
    share: ['I’m literally in one right now. Send help.'],
  },
  'Professionally? Napping.': { agree: ['Honestly, respect.'], joke: ['Same. I’m training for the Olympics.'] },

  // ---- compliments
  'Okay, I like your jacket.': { agree: ['Oh — thanks! It was my cousin’s.'], joke: ['Thanks, it’s doing all the work.'] },
  'You were really good in class today.': { agree: ['Ha, thanks. I was totally guessing.'], share: ['Thanks. I actually studied for once.'] },
  'Your stuff is always so cool.': { agree: ['Stop. Thank you.'] },
  'That’s actually really impressive.': { agree: ['Ha, thanks.'], share: ['Thanks. It took forever, honestly.'] },
  'Okay, you’re actually funny.': { agree: ['Ha, thank you. I’ll be here all week.'] },

  // ---- teasing
  'Oh, look who finally showed up.': { agree: ['Ha, I know, I know.'], tease: ['Says the person who was late Monday.'] },
  'Are you ever not eating?': { agree: ['Never. It’s a lifestyle.'], tease: ['Says you, with three cookies.'] },
  'Nice of you to join us, genius.': { agree: ['Ha. Happy to be here.'], tease: ['Wow, someone’s in a mood.'] },
  'Wow. Humble, too.': { agree: ['Ha, okay, fair.'], joke: ['Humility is my second-best skill.'] },

  // ---- bragging
  'Honestly, {a} is kind of my thing.': {
    listen: ['Okay, how did you get into {b}?'],
    compliment: ['That’s actually really cool.'],
    tease: ['Wow. Humble, too.'],
  },
  'I’m actually really good at {a}, by the way.': { tease: ['Wow. Humble, too.'], listen: ['Okay, prove it.'] },
  'People keep asking me for help with {a}.': { ask: ['Actually — could you help me with it sometime?'], tease: ['Wow. Humble, too.'] },

  // ---- shirts
  'Wait — you like {x}?': { share: ['Obsessed. Do you?'], agree: ['Ha, yes. Clearly.'] },
  'Okay, I have to ask about the {x} shirt.': { share: ['It was a birthday present. Best one ever.'], agree: ['Ha, I know, I know.'] },
  'Ha — where did you even find that shirt?': { share: ['My cousin got it for me. I love it.'], agree: ['Right? I get that a lot.'] },
  'Okay, your shirt is amazing.': { agree: ['Oh — thanks! It was my cousin’s.'], joke: ['Thanks, it’s doing all the work.'] },
  'Nice shirt. Did you lose a bet?': { agree: ['Ha. Fair.'], tease: ['At least I picked mine myself.'] },
  'Did you get dressed in the dark?': { agree: ['Ha. Maybe.'], tease: ['Says the person in that outfit.'] },
  'You actually wear a {x} shirt? In public?': { tease: ['Every day. Deal with it.'], agree: ['Ha. Yes. Proudly.'] },
  '{x}? Seriously?': { tease: ['Seriously. You’d love it if you tried it.'], agree: ['Ha, yes, seriously.'] },

  // ---- invitations
  'Want to hang out after school?': { agree: ['Sure, sounds fun!'] },
};
