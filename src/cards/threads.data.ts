/**
 * The canned threads: pre-written, reviewed, and checked in. Nothing here is generated while the game
 * runs. Read them with `pnpm threads`; the rules and writing guide are in
 * docs/design/conversation-threads.md.
 */
import type { Thread } from './threads';

export const THREADS: readonly Thread[] = [
  {
    id: 'soccer-tryouts',
    entry: { card: 'talk', interest: 'soccer' },
    facts: 'Got cut from the soccer team last year and is scared it will happen again at tryouts.',
    turns: [
      'I’ve got soccer tryouts next week. I’m kind of freaking out.',
      'Freaking out how? Like nervous, or like you don’t want to go at all?',
      'Last year I got cut. So now I’m scared it’s going to happen again.',
      'Getting cut in front of everyone would be so bad. I’d be scared of that too.',
      'Yeah. I keep picturing the list on the wall, and my name’s not on it.',
      'That list would be stuck in my head too. I won’t say you’ll definitely make it. I hope you do, though.',
      'Thanks. Everybody says I definitely will, and it kind of makes it worse.',
    ],
    choices: {
      1: {
        wrap: { line: 'Okay, tell me Monday how it goes.', reaction: 'Deal. Hopefully it’s a good story.' },
        misses: [
          { kind: 'aboutMe', line: 'I totally get it. I had to present in English and I was so nervous I couldn’t eat lunch.', reaction: 'Oh, wow. That sounds bad.' },
          { kind: 'fix', line: 'Get there early and stretch, and skip the soda before. That helps a lot.', reaction: 'Mm, okay. Maybe.' },
        ],
      },
      3: {
        wrap: { line: 'Good luck, seriously. Hope this year goes different.', reaction: 'Thanks. I’m trying to believe it.' },
        misses: [
          { kind: 'brushOff', line: 'Don’t stress, you’ll make it this time. Everybody gets cut once.', reaction: 'I guess. Maybe.' },
          { kind: 'pry', line: 'How bad was it, though? Did the coach say something to you?', reaction: 'It was fine. Honestly I’d rather not get into it.' },
        ],
      },
      5: {
        wrap: { line: 'Picturing that is rough. Text me after, whatever happens.', reaction: 'Okay. I will, even if it’s bad.' },
        misses: [
          { kind: 'tease', line: 'Okay, you’re being super dramatic about a list that doesn’t exist yet.', reaction: 'Ha, maybe. It still feels real.' },
          { kind: 'changeSubject', line: 'Speaking of lists, did you finish the science worksheet?', reaction: 'Nope. I’ll do it on the bus.' },
        ],
      },
    },
    tooSoon: {
      3: 'Mostly I’m just trying to get through next week.',
      5: 'Ha, it’s dumb. I’m overthinking it, probably.',
    },
  },
  {
    id: 'basketball-hoop',
    entry: { card: 'talk', interest: 'basketball' },
    facts: 'Shoots hoops alone at the park because the pickup games look too intimidating to join.',
    turns: [
      'I’ve been shooting at the park hoop by my house a lot lately.',
      'Lately like since school started? Or has it been a thing for a while?',
      'Since school started. There’s always a pickup game going, and I don’t want to walk up.',
      'Walking up to a game would be so hard. Everybody looks like they’ve played forever.',
      'Right, that’s the thing. I’d airball once and they’d all remember it.',
      'An airball in front of strangers is the worst. Want to shoot around at the park sometime? Just us.',
      'Yeah, that would be way less scary. I’d be down for Saturday.',
    ],
    choices: {
      1: {
        wrap: { line: 'Nice. Tell me when you finally get a game in.', reaction: 'I will. Probably not for a while.' },
        misses: [
          { kind: 'aboutMe', line: 'Totally get it. My driveway’s basically my whole summer, honestly.', reaction: 'Oh, cool. Must be nice having your own.' },
          { kind: 'fix', line: 'Try a closer spot first, like the free throw line. Builds confidence fast.', reaction: 'Maybe. Thanks, I’ll try it.' },
        ],
      },
      3: {
        wrap: { line: 'That’s fair. Good luck when you do walk up someday.', reaction: 'Maybe. I’ll get there, probably.' },
        misses: [
          { kind: 'pry', line: 'Has anybody said something to you before? Like at school?', reaction: 'No. Nothing like that. I just don’t want to.' },
          { kind: 'brushOff', line: 'Honestly, they’d probably pass you the ball. Don’t overthink it.', reaction: 'Yeah. Easier said than done.' },
        ],
      },
      5: {
        wrap: { line: 'Okay, that makes sense. Hope the shots start falling for you.', reaction: 'Thanks. Maybe they will.' },
        misses: [
          { kind: 'tease', line: 'Oh no, not an airball. Somebody call the news.', reaction: 'Ha, you didn’t see it.' },
          { kind: 'changeSubject', line: 'Hey, are you going to the football game Friday?', reaction: 'Probably not. Maybe next week.' },
        ],
      },
    },
    tooSoon: {
      3: 'Mm, it’s not that deep. I’m just overthinking it.',
      5: 'Maybe sometime. I kind of like going by myself right now.',
    },
  },
  {
    id: 'games-alone',
    entry: { card: 'talk', interest: 'video games' },
    facts: 'The group they played online games with since middle school has drifted apart, and now they log on alone.',
    turns: [
      'I’ve been playing video games a lot since school started. Mostly by myself.',
      'Mostly by yourself? Is that new, or did you always play alone?',
      'It’s new. I used to play with a group from middle school every night. Now they barely log on.',
      'Groups fading out like that is weird. You kind of notice the quiet first.',
      'Yeah. The games are fine. It’s the people I miss, and I don’t know what to say to them now.',
      'Not knowing what to say is the hardest part. I keep typing and deleting stuff too.',
      'Yeah, deleting is the worst. Maybe I’ll just send the dumb one.',
    ],
    choices: {
      1: {
        wrap: { line: 'Cool, hope you find a game that’s fun. Tell me what it is.', reaction: 'Sure. It’ll probably be something with a lot of building.' },
        misses: [
          { kind: 'aboutMe', line: 'I get that. I play by myself all the time, and honestly I’m kind of good at it.', reaction: 'Oh, nice. Good for you.' },
          { kind: 'fix', line: 'Try an online group for people your age. Way easier to find people.', reaction: 'Maybe. I’ll look at it.' },
        ],
      },
      3: {
        wrap: { line: 'I’m sorry. Hope they come back around.', reaction: 'Hope so. Thanks.' },
        misses: [
          { kind: 'brushOff', line: 'You’ll make friends at school way faster, don’t worry about it.', reaction: 'Maybe. It’s not that simple.' },
          { kind: 'pry', line: 'Hold on, did something happen with them? Like a fight?', reaction: 'No, nothing like that. It just kind of happened.' },
        ],
      },
      5: {
        wrap: { line: 'Ugh, that’s hard. Hope you figure out what to say.', reaction: 'Ha, I’ll probably send something dumb first.' },
        misses: [
          { kind: 'tease', line: 'Wow, you’re way too sad about a few people from a game.', reaction: 'Ha, rude. They were pretty fun, though.' },
          { kind: 'changeSubject', line: 'That reminds me, I have to text my group about the English project.', reaction: 'Oh. Yeah, go ahead.' },
        ],
      },
    },
    tooSoon: {
      3: 'Hm, yeah. They’re probably just busy.',
      5: 'Eh, I’ll figure it out.',
    },
  },
  {
    id: 'anime-drawing',
    entry: { card: 'talk', interest: 'anime' },
    facts: 'Draws anime characters in the back of a notebook and worries people will think it’s weird.',
    turns: [
      'I’ve been watching a lot of anime lately. It’s kind of taking over my nights.',
      'Taking over how? Like, are you watching all night, or doing other stuff too?',
      'Mostly watching. I also draw them in the back of my notebook. Nobody knows that part.',
      'I’d be nervous showing somebody a notebook like that. It feels too personal.',
      'Yeah, it’s personal. The drawing’s the part I’m proud of, and I’m scared people will laugh.',
      'Being proud of something and scared to show it is so real. Want to show me one sometime?',
      'Maybe. Thanks for not making it a big thing.',
    ],
    choices: {
      1: {
        wrap: { line: 'Okay, send me your top three when you’re done.', reaction: 'Ha, deal. Some of them are kind of long.' },
        misses: [
          { kind: 'aboutMe', line: 'I totally get the nights thing. I was up till two on a cooking show last week.', reaction: 'Mm. Yeah.' },
          { kind: 'fix', line: 'Set a timer so you stop at a set time. That helps with sleep a lot.', reaction: 'I might try that, actually.' },
        ],
      },
      3: {
        wrap: { line: 'That’s cool that you make stuff like that. Keep at it.', reaction: 'Okay, I’ll try.' },
        misses: [
          { kind: 'tease', line: 'So your notebook’s basically a secret anime museum? Very mysterious.', reaction: 'Ha, kind of. It’s not that deep.' },
          { kind: 'changeSubject', line: 'Random question, are you going to the club fair?', reaction: 'Probably. Not sure yet.' },
        ],
      },
      5: {
        wrap: { line: 'Keeping that in a notebook is a lot. I hope someone sees them someday.', reaction: 'Thanks, that’s nice of you to say.' },
        misses: [
          { kind: 'brushOff', line: 'Nobody’s going to laugh. They’ll think it’s cool. Don’t worry.', reaction: 'Maybe. I hope so.' },
          { kind: 'pry', line: 'What are the drawings even of? Like, which characters?', reaction: 'Just some random ones. I’d rather not say.' },
        ],
      },
    },
    tooSoon: {
      3: 'Yeah, it’s nothing. I just don’t really show people stuff.',
      5: 'Ha, maybe. I’d have to be way less nervous first.',
    },
  },
  {
    id: 'pop-singing',
    entry: { card: 'talk', interest: 'pop music' },
    facts: 'Loves singing pop songs and wants to sing in front of people, but freezes up whenever anyone is listening.',
    turns: [
      'I’ve been singing a lot of pop songs lately. Mostly alone in my room.',
      'Mostly alone? Do you not want anyone hearing you, or is it just easier?',
      'I’d actually like people to hear. But when someone’s around I freeze and go quiet.',
      'Does your voice go weird, or do you just stop?',
      'My throat goes tight, and I can hear how thin I sound. So I just stop.',
      'Hearing yourself sound thin would make me stop too. That’s the worst part.',
      'Yeah. It’s nice to hear someone else would stop too.',
    ],
    choices: {
      1: {
        wrap: { line: 'That’s cool. Keep at it, whatever you’re doing.', reaction: 'I’ll try. Thanks.' },
        misses: [
          { kind: 'aboutMe', line: 'I get singing alone. I’m the same in the car, windows up so nobody sees.', reaction: 'Cool, I guess.' },
          { kind: 'fix', line: 'You should try a choir or a voice class. That’s how people get over it.', reaction: 'Maybe. Our school might have one.' },
        ],
      },
      3: {
        wrap: { line: 'Okay, that’s a rough one. Hope it gets easier, for real.', reaction: 'Me too. Thanks.' },
        misses: [
          { kind: 'brushOff', line: 'Once you start, you’ll be fine. Everybody’s nervous at first.', reaction: 'Yeah, everybody says that.' },
          { kind: 'changeSubject', line: 'Hey, are you signing up for the talent show?', reaction: 'Nah, probably not.' },
        ],
      },
      5: {
        wrap: { line: 'Scary. Hope the next time goes better.', reaction: 'I hope so.' },
        misses: [
          { kind: 'tease', line: 'Thin? Okay, dramatic. Your voice is probably fine, honestly.', reaction: 'Ha. Not helpful, but okay.' },
          { kind: 'pry', line: 'Somebody said something when you sang before, right?', reaction: 'No, nobody said anything. I just don’t like it.' },
        ],
      },
    },
    tooSoon: {
      3: 'Haha, I don’t know. It’s kind of a weird thing to talk about.',
      5: 'Ha, I don’t know. Let’s talk about something else.',
    },
  },
  {
    id: 'hiphop-lyrics',
    entry: { card: 'talk', interest: 'hip-hop' },
    facts: 'Writes rap lyrics in a notebook, and nobody has ever heard any of them.',
    turns: [
      'Lately I’ve been writing hip-hop lyrics. Nobody’s heard any of them yet.',
      'Not even one person? What are they usually about?',
      'Mostly school stuff and my neighborhood. I’ve never read one out loud to anybody.',
      'Is it reading one out loud that scares you, or what people would think after?',
      'Yeah, what they’d think. I’m scared it’ll sound corny and everyone will just be polite.',
      'Polite is so much worse than mean. I’d rather somebody just say it’s bad.',
      'Yeah. Maybe I’ll read you one, if you’re honest with me.',
    ],
    choices: {
      1: {
        wrap: { line: 'Okay, I’m curious now. Tell me when one’s done.', reaction: 'Ha, it’s a long way off.' },
        misses: [
          { kind: 'aboutMe', line: 'I get wanting to hide them. I tried a poem once and quit after two lines.', reaction: 'Oh, nice. Two lines is a start, I guess.' },
          { kind: 'changeSubject', line: 'Random question, are you going to the dance next month?', reaction: 'Nah. Maybe.' },
        ],
      },
      3: {
        wrap: { line: 'That’s cool. Hope you keep writing them, whatever happens.', reaction: 'Okay, I’ll keep at it.' },
        misses: [
          { kind: 'fix', line: 'You should go to an open mic. That’s how people get used to it.', reaction: 'Maybe. That’s a lot, though.' },
          { kind: 'brushOff', line: 'I bet they’re really good. You have nothing to worry about.', reaction: 'Ha, you haven’t heard them.' },
        ],
      },
      5: {
        wrap: { line: 'Polite is rough. Hope somebody surprises you someday.', reaction: 'Thanks. Okay, maybe.' },
        misses: [
          { kind: 'pry', line: 'Which line would be the worst, if people said something?', reaction: 'Nah, I’m not telling you that.' },
          { kind: 'tease', line: 'Corny? Okay, so you’re basically a secret rap star now.', reaction: 'Ha, okay. Not a star.' },
        ],
      },
    },
    tooSoon: {
      3: 'Eh, I don’t know. Probably both.',
      5: 'Ha, yeah. I don’t really want to think about it.',
    },
  },
  {
    id: 'fashion-thrift',
    entry: { card: 'talk', interest: 'fashion' },
    facts: 'Remakes thrift store clothes to look new, and worries people will find out it’s because money is tight.',
    turns: [
      'I’ve been remaking thrift store clothes lately. Cutting them and sewing them different.',
      'Remaking them how? Like the fit, or a whole new look?',
      'Mostly the fit. I took a jacket that was huge and made it actually fit me.',
      'Wait, do people know you made them? Or do they think you bought them new?',
      'Most people think I bought them new. Money’s kind of tight at home, so I’d rather keep it that way.',
      'I won’t tell anybody. And making a jacket fit is still really cool.',
      'Thanks. It’s nice to say it to someone who doesn’t make it weird.',
    ],
    choices: {
      1: {
        wrap: { line: 'Show me the next one when it’s done.', reaction: 'Ha, it’ll be a mess first.' },
        misses: [
          { kind: 'fix', line: 'Use a sewing machine instead. It’s way faster than hand stitching.', reaction: 'Yeah, maybe. I don’t have one.' },
          { kind: 'tease', line: 'Thrift store? Your closet’s going to be the coolest in the building.', reaction: 'Ha, I wish.' },
        ],
      },
      3: {
        wrap: { line: 'Good trick. Hope the next one fits just as well.', reaction: 'Mostly trial and error, honestly.' },
        misses: [
          { kind: 'aboutMe', line: 'Oh, I totally get fit stuff. My jeans are always too long, so I roll them.', reaction: 'Ha, okay. Cool.' },
          { kind: 'changeSubject', line: 'Did you see the schedule change for gym? Everybody’s freaking out.', reaction: 'Nope, I’ll look later.' },
        ],
      },
      5: {
        wrap: { line: 'I get wanting to keep it quiet. Good luck with the next one.', reaction: 'Thanks. Appreciate it.' },
        misses: [
          { kind: 'brushOff', line: 'Nobody’s going to think that about you. Everything looks new anyway.', reaction: 'I hope so, honestly.' },
          { kind: 'pry', line: 'Like how tight, though? Do you guys not have enough?', reaction: 'It’s fine. I’d rather not talk about it.' },
        ],
      },
    },
    tooSoon: {
      3: 'Eh, I don’t really think about it.',
      5: 'Mostly I’m just tired of thinking about it.',
    },
  },
  {
    id: 'shows-grandma',
    entry: { card: 'talk', interest: 'TV shows' },
    facts: 'Used to watch a show every Sunday with grandma, who has since moved across the country.',
    turns: [
      'I’ve been rewatching this old show I used to watch with my grandma.',
      'Your grandma watched it with you? Did you guys do it every week?',
      'Pretty much. Every Sunday. She’d make popcorn and yell at the characters.',
      'A routine like that is hard to replace. You kind of notice it on Sundays.',
      'Yeah. She moved across the country last year, and now it’s just me and the TV.',
      'Sundays would feel empty without her there. Want to watch an episode with me?',
      'Yeah, that’d be fun. She’d probably want to hear what you think of it.',
    ],
    choices: {
      1: {
        wrap: { line: 'Rewatching it sounds nice. Hope it still holds up.', reaction: 'It mostly does. Thanks.' },
        misses: [
          { kind: 'aboutMe', line: 'I get rewatching. I’ve seen one show like six times, honestly.', reaction: 'Cool. Nice.' },
          { kind: 'changeSubject', line: 'Random, but did you get the email about the schedule change?', reaction: 'Hm, I’ll check.' },
        ],
      },
      3: {
        wrap: { line: 'That sounds like a really good Sunday.', reaction: 'It was a good one. Thanks.' },
        misses: [
          { kind: 'fix', line: 'Call her and watch it at the same time, like a watch party.', reaction: 'Maybe. We kind of tried that once.' },
          { kind: 'pry', line: 'Why’d she move, though? Was it for a job or something?', reaction: 'It’s a long story. I’d rather not.' },
        ],
      },
      5: {
        wrap: { line: 'Sundays must be so quiet now. Hope it gets less empty.', reaction: 'Maybe it will. Thanks.' },
        misses: [
          { kind: 'brushOff', line: 'At least you can still talk on the phone. You’ll be fine.', reaction: 'I guess.' },
          { kind: 'tease', line: 'Are you going to start yelling at the characters too?', reaction: 'Ha. No. It’s not the same.' },
        ],
      },
    },
    tooSoon: {
      3: 'Eh, it’s just TV, really.',
      5: 'Ha, maybe. It’s kind of our show, though.',
    },
  },
  {
    id: 'coding-broken',
    entry: { card: 'talk', interest: 'coding' },
    facts: 'Has a coding project that won’t work, and secretly feels everyone else is smarter at this.',
    turns: [
      'I’ve been trying to code a little game, but it keeps crashing.',
      'Every time, or just when you click something?',
      'Sometimes, when I click the button. I’ve been stuck on it for like three days.',
      'Three days? Are you more mad at the game, or at yourself?',
      'At myself, honestly. Everyone else seems to already get it, so I feel dumb asking.',
      'Feeling like the only one lost is the worst. Want to look at it together?',
      'Yeah, okay. That would help. Thanks for not acting like it’s obvious.',
    ],
    choices: {
      1: {
        wrap: { line: 'That’s annoying. Tell me if you figure it out.', reaction: 'I will. If I don’t, I’ll complain about it later.' },
        misses: [
          { kind: 'fix', line: 'Just google the error message. That’s what everybody does.', reaction: 'I did that already. Didn’t help.' },
          { kind: 'aboutMe', line: 'I totally get crashing. My last project crashed like five times.', reaction: 'Good to know, I guess.' },
        ],
      },
      3: {
        wrap: { line: 'Three days is rough. Good luck getting it to work.', reaction: 'Thanks. I’ll ask someone eventually.' },
        misses: [
          { kind: 'brushOff', line: 'You seem smart, you’ll get it. Don’t stress.', reaction: 'Eventually, I guess.' },
          { kind: 'changeSubject', line: 'Got the math homework done yet? It was so long.', reaction: 'Ugh, I’ll do it tonight.' },
        ],
      },
      5: {
        wrap: { line: 'Okay, that makes sense. Hope the button works soon.', reaction: 'It better, after this week. Thanks.' },
        misses: [
          { kind: 'tease', line: 'Wow, defeated by one little button.', reaction: 'Ha. Thanks, I guess.' },
          { kind: 'pry', line: 'Has someone in class said something about it?', reaction: 'No, nobody said anything. It’s just a feeling.' },
        ],
      },
    },
    tooSoon: {
      3: 'Ha, it’s a dumb bug, that’s all.',
      5: 'Nah, it’s okay. I’ll figure it out.',
    },
  },
  {
    id: 'books-lunch',
    entry: { card: 'talk', interest: 'books' },
    facts: 'Reads a book at lunch every day, partly so it doesn’t look like they’re sitting alone.',
    turns: [
      'I’ve been reading a lot during lunch. Like, a whole book a week.',
      'Why at lunch, though? Is it the quiet, or the book?',
      'Partly the book. Partly because it looks like I’m busy and not just sitting alone.',
      'Does it bug you more that people notice, or that you’re actually alone?',
      'Both, I guess. Mostly the noticing part. I’m scared someone sees me and feels sorry for me.',
      'I get that. Being looked at like that is worse than being bored.',
      'Yeah, exactly. It’s nice when someone gets it fast.',
    ],
    choices: {
      1: {
        wrap: { line: 'That’s awesome. Hope the next one’s just as good.', reaction: 'It’s a long one, so we’ll see.' },
        misses: [
          { kind: 'aboutMe', line: 'A whole book a week? I’d be so behind. I can barely finish one for English.', reaction: 'Ha, yeah. It’s not that hard once you start.' },
          { kind: 'changeSubject', line: 'Do you know if it’s pizza again tomorrow?', reaction: 'I think it’s tacos. Not sure.' },
        ],
      },
      3: {
        wrap: { line: 'That’s smart, honestly. Hope lunch gets less lonely.', reaction: 'Right, I hope so. Thanks.' },
        misses: [
          { kind: 'fix', line: 'Go to the library club. You’d meet people who like books.', reaction: 'Maybe. I’m not really a club person.' },
          { kind: 'tease', line: 'The book is basically a lunch prop now? Very dramatic.', reaction: 'Ha, it’s a good prop, honestly.' },
        ],
      },
      5: {
        wrap: { line: 'Carrying that around at lunch sounds hard. Good luck with it.', reaction: 'Yeah, it is. Thanks.' },
        misses: [
          { kind: 'brushOff', line: 'Nobody’s going to feel sorry for you. You’ll make friends, it’s early.', reaction: 'It’s early, I guess.' },
          { kind: 'pry', line: 'Has anyone actually said something mean about it?', reaction: 'No, not really. I’d rather not talk about it.' },
        ],
      },
    },
    tooSoon: {
      3: 'Ha, I don’t know. Lunch is just lunch.',
      5: 'Ha, I guess. It’s not that serious.',
    },
  },
  {
    id: 'ask-place',
    entry: { card: 'ask', question: 'What do you think of this place so far?' },
    facts: 'Moved to a new town over the summer and misses being somewhere where everyone knew them.',
    turns: [
      'It’s fine so far. Kind of weird, though. Nobody here knows me at all.',
      'Weird how? Did everyone know you where you were before?',
      'Pretty much. Everybody on my old street knew my name, and I knew theirs.',
      'Knowing everyone’s name is kind of a big deal. You don’t notice it until it’s gone.',
      'Yeah. Like at lunch, I keep looking around for somebody to wave at, and nobody’s waving.',
      'Lunch is the worst place to be new. I’m new too. Walk to class together tomorrow?',
      'Yeah, that would help a lot. See you at the lockers, then.',
    ],
    choices: {
      1: {
        wrap: { line: 'That’s rough. Hope it gets less weird soon.', reaction: 'Yeah. Hopefully.' },
        misses: [
          { kind: 'aboutMe', line: 'That’s rough. I get lost every day, and yesterday I was late to three classes.', reaction: 'Oh. Yeah, the halls are confusing.' },
          { kind: 'changeSubject', line: 'At least the cafeteria pizza’s good. Have you had it yet?', reaction: 'Not yet. I guess I’ll try it.' },
        ],
      },
      3: {
        wrap: { line: 'Nice. Hope you find that again here.', reaction: 'Thanks. Maybe someday.' },
        misses: [
          { kind: 'fix', line: 'Join a club. That’s the fastest way to meet people.', reaction: 'I know. I just haven’t yet.' },
          { kind: 'brushOff', line: 'You’ll have that again in like a month. Everyone here is nice.', reaction: 'Maybe. Feels longer than a month.' },
        ],
      },
      5: {
        wrap: { line: 'Lunch is the worst. Hope someone waves back soon.', reaction: 'Thanks. Fingers crossed.' },
        misses: [
          { kind: 'tease', line: 'Waving at nobody, huh? Very friendly of you.', reaction: 'Ha, very funny. Thanks.' },
          { kind: 'pry', line: 'You sat by yourself the whole week?', reaction: 'Most days. It’s not that bad.' },
        ],
      },
    },
    tooSoon: {
      3: 'It’s a new place. It’ll be fine, probably.',
      5: 'Eh, maybe. I usually just walk by myself.',
    },
  },
  {
    id: 'ask-week',
    entry: { card: 'ask', question: 'How’s your week going?' },
    facts: 'Is behind in math and has been hiding it from everyone, including their parents.',
    turns: [
      'It’s kind of a mess, honestly. I’m behind in math and haven’t said anything.',
      'Behind how? Did you miss a few days, or is it just hard to keep up?',
      'It’s just hard. We started a new unit and I got lost, and now I’m doing homework I don’t get.',
      'Math can go from fine to lost in like one day. It’s easy to fall behind that way.',
      'Yeah, and I keep saying I’m fine so nobody asks. I don’t want my parents to freak out.',
      'Saying fine when you’re not is so tiring. Could we go over it together after school?',
      'Yeah, that would help a lot. Thanks for not making it weird.',
    ],
    choices: {
      1: {
        wrap: { line: 'Sorry. Hope it gets easier soon.', reaction: 'Maybe it will. Thanks.' },
        misses: [
          { kind: 'aboutMe', line: 'Oof, same. I’m behind in history, and nobody knows that either.', reaction: 'Oh, okay. Cool.' },
          { kind: 'fix', line: 'Tell your teacher today. They’ll help if you ask early.', reaction: 'Yeah, I know. I’ll think about it.' },
        ],
      },
      3: {
        wrap: { line: 'Ugh, that’s a lot to catch up on. Good luck, seriously.', reaction: 'I’ll need it. Thanks.' },
        misses: [
          { kind: 'brushOff', line: 'Don’t stress, it’s just one unit. You’ll be caught up in no time.', reaction: 'Hopefully. I’m trying.' },
          { kind: 'changeSubject', line: 'Hey, is everybody going to the game Friday?', reaction: 'Probably not. I have stuff to do.' },
        ],
      },
      5: {
        wrap: { line: 'Keeping that in sounds exhausting. Glad you said something.', reaction: 'It felt kind of good, actually. Thanks.' },
        misses: [
          { kind: 'pry', line: 'Are your parents really strict about grades, or is it more you?', reaction: 'Both, I guess. I don’t want to get into it.' },
          { kind: 'tease', line: 'Math got you, huh? Sounds like math is winning this one.', reaction: 'Ha, math is definitely winning.' },
        ],
      },
    },
    tooSoon: {
      3: 'Ha, math is just hard for me.',
      5: 'Eh, I’ll manage. It’s not that bad.',
    },
  },
  {
    id: 'ask-weekend',
    entry: { card: 'ask', question: 'What did you do this weekend?' },
    facts: 'Spent the weekend watching a little brother while the parents worked, and misses having free time.',
    turns: [
      'I watched my little brother most of the weekend. My parents both had to work.',
      'The whole weekend? Was it all day, or just some of it?',
      'Pretty much all day Saturday, and Sunday morning. He’s six and wanted to play nonstop.',
      'Six-year-olds don’t really stop. I’d be wiped out too.',
      'Yeah. I kept seeing my friends’ pictures from the mall and feeling stuck at home.',
      'Feeling stuck while everyone’s out is the worst. We could do something this weekend, even just a walk.',
      'Yeah, okay. Maybe Saturday, if my mom says I can get out.',
    ],
    choices: {
      1: {
        wrap: { line: 'A whole weekend. Hope your next one is more fun.', reaction: 'Thanks. It’ll be better if I get a break.' },
        misses: [
          { kind: 'aboutMe', line: 'A whole weekend? I’m sorry. I babysit my sister, so I know how that goes.', reaction: 'Yeah, it’s a lot.' },
          { kind: 'changeSubject', line: 'Random, but have you seen the new bus schedule? It changed.', reaction: 'I’ll look later.' },
        ],
      },
      3: {
        wrap: { line: 'Six year olds are a lot. Glad you got through it.', reaction: 'Thanks. Yeah, he was a lot.' },
        misses: [
          { kind: 'fix', line: 'Next time, put on a movie and make him sit still. Works every time.', reaction: 'Maybe. He doesn’t really sit still.' },
          { kind: 'tease', line: 'Six? You’re basically a babysitter now. Get your money, boss.', reaction: 'Ha, no money. Just pizza.' },
        ],
      },
      5: {
        wrap: { line: 'Ugh, that’s the worst. Hope you get a day off soon.', reaction: 'Me too, honestly. Thanks.' },
        misses: [
          { kind: 'brushOff', line: 'There’ll be plenty of free time later. Don’t worry about it.', reaction: 'Later, I hope.' },
          { kind: 'pry', line: 'Why didn’t your parents get someone else? Is it a money thing?', reaction: 'It’s complicated, honestly. I can’t really get into it.' },
        ],
      },
    },
    tooSoon: {
      3: 'Ha, he’s not that bad. Mostly.',
      5: 'Maybe later. I’ll see how it goes.',
    },
  },
  {
    id: 'ask-classes',
    entry: { card: 'ask', question: 'What classes do you have?' },
    facts: 'Signed up for an art elective to be with a friend, who then switched out, so now they’re in it with no one they know.',
    turns: [
      'Normal stuff, plus art. I picked it because my friend was in it, but they switched.',
      'Wait, they switched out? Is art still okay without them?',
      'It’s okay, I guess. I don’t know anyone in there now, and everyone already has their groups.',
      'Do you feel stuck in it, or is it more just awkward?',
      'Kind of stuck. I can’t switch, because my schedule’s full, and I didn’t even want art that much.',
      'I’d have picked it for a friend too. It’s not dumb. It just sucks now.',
      'Thanks. I kind of needed someone to say it’s not dumb.',
    ],
    choices: {
      1: {
        wrap: { line: 'That’s kind of a bummer. Hope art’s fun anyway.', reaction: 'Thanks. Maybe it’ll grow on me.' },
        misses: [
          { kind: 'aboutMe', line: 'Oof, art. I took a class once just because a friend was in it, and it was awful.', reaction: 'Huh. Yeah.' },
          { kind: 'changeSubject', line: 'Do you know what time the bus comes on Thursdays?', reaction: 'No idea. Probably late.' },
        ],
      },
      3: {
        wrap: { line: 'Sounds lonely. Hope it gets better soon.', reaction: 'It will, probably. Thanks.' },
        misses: [
          { kind: 'fix', line: 'Ask the teacher for a project partner. It’s super easy.', reaction: 'I could. It’s awkward, though.' },
          { kind: 'brushOff', line: 'Everyone’s nice, you’ll have a group in a week. Don’t stress.', reaction: 'A week, I guess.' },
        ],
      },
      5: {
        wrap: { line: 'Annoying. Hope you find something good about it.', reaction: 'Yep. Me too.' },
        misses: [
          { kind: 'tease', line: 'You took art for a friend who left you in it? Classic.', reaction: 'Ha, yeah, classic. Thanks.' },
          { kind: 'pry', line: 'Why’d your friend switch? Or did they just leave?', reaction: 'They didn’t say much. I’d rather not get into it.' },
        ],
      },
    },
    tooSoon: {
      3: 'Mm, it’s not that bad. Art’s fine.',
      5: 'Ha, I’ll survive. It’s just a class.',
    },
  },
  {
    id: 'ask-later',
    entry: { card: 'ask', question: 'Are you doing anything later?' },
    facts: 'Goes home to an empty house after school most days, and it feels lonely.',
    turns: [
      'Nope, I’m just going home. My parents don’t get back until like seven.',
      'Home by yourself until seven? What do you do in the meantime?',
      'Mostly homework, or I watch stuff on my phone. The house is really quiet.',
      'Quiet houses are weird. The silence kind of fills up with your own thoughts.',
      'Yeah. The first ten minutes after I walk in are the worst. I put on music just to hear something.',
      'Walking into a silent house would get to me too. That’s a rough first ten minutes.',
      'Yeah, that’s the exact part. Thanks for getting it.',
    ],
    choices: {
      1: {
        wrap: { line: 'Cool, have a good afternoon. See you tomorrow.', reaction: 'You too. See you.' },
        misses: [
          { kind: 'aboutMe', line: 'Oh, my mom’s home late too. I just play games till dinner.', reaction: 'Cool. Yeah.' },
          { kind: 'changeSubject', line: 'Anyway, did you finish the English reading? It was long.', reaction: 'Not yet. I’m going to try tonight.' },
        ],
      },
      3: {
        wrap: { line: 'Quiet like that is rough. Hope you get some company soon.', reaction: 'Thanks. It’s really quiet.' },
        misses: [
          { kind: 'fix', line: 'Join something after school. That’d fill the time right up.', reaction: 'Yeah, maybe. I’m not really a joiner.' },
          { kind: 'tease', line: 'Your house is basically a library now. Very cozy.', reaction: 'Ha, it’s definitely quieter than cozy.' },
        ],
      },
      5: {
        wrap: { line: 'That first part of the day is rough. Hope it gets easier.', reaction: 'Thanks. I’m trying.' },
        misses: [
          { kind: 'brushOff', line: 'Soon you’ll be busy, and it’ll fill up. Don’t worry.', reaction: 'Hopefully. It’s just a lot right now.' },
          { kind: 'pry', line: 'Have your parents been gone a lot lately? Or is it always like this?', reaction: 'It’s always been like this. I don’t really want to talk about it.' },
        ],
      },
    },
    tooSoon: {
      3: 'Hm, it’s just a house.',
      5: 'Ha, I’m fine. Music helps, mostly.',
    },
  },
  {
    id: 'open-parents',
    entry: { card: 'openup' },
    facts: 'Parents argue a lot at night, and it’s hard to sleep or focus, which is too big for a friend to fix alone.',
    turns: [
      'Kind of a heavy thing, but my parents have been fighting a lot lately.',
      'Fighting like yelling, or more like being quiet and mad at each other?',
      'Yelling, mostly at night. I can hear it through my wall, so I can’t really sleep.',
      'How are you doing during the day, after a night like that?',
      'Tired, and kind of numb. I can’t focus in class, so I act normal so nobody asks.',
      'Acting normal all day sounds exhausting. Is there like an aunt or a counselor or somebody? You can still complain to me.',
      'Yeah, maybe my aunt. I’ll think about it. Thanks for saying it like that.',
    ],
    choices: {
      1: {
        wrap: { line: 'That’s hard. Thanks for telling me, I’m glad you did.', reaction: 'Yeah. Thanks for listening.' },
        misses: [
          { kind: 'aboutMe', line: 'Oof, my parents fight about money too, so I get it. It’s annoying.', reaction: 'Huh, that’s rough.' },
          { kind: 'fix', line: 'Maybe just tell them it’s bugging you and they should stop.', reaction: 'Yeah, that’s not really how it works.' },
        ],
      },
      3: {
        wrap: { line: 'That’s awful. Hope it calms down soon.', reaction: 'Yeah, me too.' },
        misses: [
          { kind: 'brushOff', line: 'I’m sure it’s not that bad. Parents fight all the time, it’ll pass.', reaction: 'Maybe. It doesn’t feel normal.' },
          { kind: 'changeSubject', line: 'Going to the dance? Someone said it’s going to be packed.', reaction: 'No idea. Probably not.' },
        ],
      },
      5: {
        wrap: { line: 'Carrying that all day is rough. I’m glad you told me.', reaction: 'It’s nice to say it out loud. Thanks.' },
        misses: [
          { kind: 'tease', line: 'Acting normal? You’re a better actor than I thought.', reaction: 'Ha, I guess. Not really.' },
          { kind: 'pry', line: 'Are they going to split up, do you think?', reaction: 'No idea. I’d rather not talk about that.' },
        ],
      },
    },
    tooSoon: {
      3: 'Mm, it’s fine. I’m kind of used to ignoring it.',
      5: 'Ha, it’s fine. I don’t really want to get into it.',
    },
  },
  {
    id: 'open-lonely',
    entry: { card: 'openup' },
    facts: 'Has people to sit with and talk to at school, but no one feels like a real friend yet.',
    turns: [
      'This is kind of dumb, but I still don’t really have a real friend here.',
      'Not dumb. What would make it feel like a real friend, to you?',
      'Someone I could text when something bad happens. Right now I just text people about homework.',
      'Texting about homework is so different. I’d want someone for the bad stuff too.',
      'Yeah. I got a bad grade last week and didn’t tell anyone, not even the people I sit with.',
      'Keeping a bad grade to yourself sounds rough. Want to get lunch together tomorrow?',
      'Okay, yeah. Thanks for actually asking, not just saying hi.',
    ],
    choices: {
      1: {
        wrap: { line: 'That’s real. Hope you find one soon, for sure.', reaction: 'It’d be nice.' },
        misses: [
          { kind: 'aboutMe', line: 'I get that. I haven’t made one yet either, and it’s been a month.', reaction: 'Cool. Yeah.' },
          { kind: 'fix', line: 'Just go up to people and ask them to hang out. That’s all it takes.', reaction: 'It’s not that easy, though.' },
        ],
      },
      3: {
        wrap: { line: 'Good thing to want. Hope you find that soon.', reaction: 'I’ll keep looking, I guess. Thanks.' },
        misses: [
          { kind: 'brushOff', line: 'You’re going to find someone, don’t worry. It’s still early.', reaction: 'I know. Still feels like a lot.' },
          { kind: 'changeSubject', line: 'Is the science project a group thing, or can you do it alone?', reaction: 'Probably alone, I think.' },
        ],
      },
      5: {
        wrap: { line: 'Keeping that in is rough. Glad you told me, at least.', reaction: 'It helps a little. Thanks.' },
        misses: [
          { kind: 'tease', line: 'A bad grade? Okay, you’ve got a secret life now. Very mysterious.', reaction: 'Ha, not really. It’s just a grade.' },
          { kind: 'pry', line: 'What was the grade? Was it failing, or just bad?', reaction: 'It’s a C minus. I really don’t want to talk about it.' },
        ],
      },
    },
    tooSoon: {
      3: 'Mm, yeah. Texting’s kind of normal, I guess.',
      5: 'Eh, maybe. I’ll see how I feel tomorrow.',
    },
  },
  {
    id: 'open-bestfriend',
    entry: { card: 'openup' },
    facts: 'A best friend from middle school stopped answering texts at the start of high school, and they don’t know why.',
    turns: [
      'Kind of a weird one. My best friend from middle school stopped answering my texts.',
      'Like totally stopped, or just slow? When did it start?',
      'Since like the second week of school. I text and it just shows delivered, and nothing.',
      'Do you know why? Like, did anything happen?',
      'No idea. I keep rereading our last texts, like maybe I said something dumb.',
      'I’d reread them too. It’s so much worse when nobody tells you why.',
      'Yeah, that’s exactly it. Maybe I’ll ask them sometime, or just let it go.',
    ],
    choices: {
      1: {
        wrap: { line: 'That sucks. Hope they text you back soon.', reaction: 'Me too, I hope so.' },
        misses: [
          { kind: 'aboutMe', line: 'That’s so annoying. My old friends mostly stopped texting, honestly, and I let it go.', reaction: 'Huh. Yeah.' },
          { kind: 'changeSubject', line: 'Okay, did you see the lunch line? It’s super long now.', reaction: 'Yeah, it’s a mess today.' },
        ],
      },
      3: {
        wrap: { line: 'Ugh, I’m sorry. Hope they write back soon.', reaction: 'I hope they do, honestly.' },
        misses: [
          { kind: 'fix', line: 'Call them instead of texting. Way more direct.', reaction: 'I did once. It went to voicemail.' },
          { kind: 'brushOff', line: 'They’re probably just busy with new stuff. Don’t take it personally.', reaction: 'Probably. It still stings.' },
        ],
      },
      5: {
        wrap: { line: 'That’s hard. I’m glad you told me about it.', reaction: 'It helps to say it. Thanks.' },
        misses: [
          { kind: 'tease', line: 'What’d you say, a whole essay? Maybe they got bored.', reaction: 'Ha, rude. It was short, actually.' },
          { kind: 'pry', line: 'Hold on, what’s the last thing you sent them?', reaction: 'Nope, I don’t want to read it out loud.' },
        ],
      },
    },
    tooSoon: {
      3: 'Mm, probably nothing. They’re busy.',
      5: 'Ha, yeah. I’d rather not dig into it.',
    },
  },
  {
    id: 'open-nervous',
    entry: { card: 'openup' },
    facts: 'Feels nervous all day at school and acts fine, and it’s wearing them down; too much to carry alone.',
    turns: [
      'I’ve been feeling kind of nervous all day, honestly. Like a constant knot in my stomach.',
      'All day, even when nothing’s happening? Does it ever go away?',
      'Pretty much, yeah. Even in class, I’m waiting for something bad to happen.',
      'I get that knot too sometimes. It makes everything feel heavier.',
      'Yeah. And I don’t even know what the bad thing is. I just act fine all day.',
      'That’s a lot to carry around all day. Is there like a counselor or somebody you could tell?',
      'Yeah, maybe. I haven’t told anyone yet, but I think I should. Thanks.',
    ],
    choices: {
      1: {
        wrap: { line: 'That sounds rough. Hope it eases up soon.', reaction: 'Thanks, that helps a little.' },
        misses: [
          { kind: 'aboutMe', line: 'I totally get nervous. I’m like that before every single test.', reaction: 'Oh. Yeah, tests are rough.' },
          { kind: 'fix', line: 'Try breathing in for four and out for six. It helps, I swear.', reaction: 'Okay, maybe. I’ll try it.' },
        ],
      },
      3: {
        wrap: { line: 'Waiting like that wears you out. Hope it stops soon.', reaction: 'Yeah, I hope it does.' },
        misses: [
          { kind: 'brushOff', line: 'Nothing bad’s going to happen, you’re just stressed. You’ll be fine.', reaction: 'I guess. It doesn’t feel like that.' },
          { kind: 'changeSubject', line: 'Do you know if the field trip is still happening?', reaction: 'Haven’t heard, honestly.' },
        ],
      },
      5: {
        wrap: { line: 'Glad you said it out loud. Hope it gets lighter.', reaction: 'I didn’t think I’d actually say it. Thanks.' },
        misses: [
          { kind: 'tease', line: 'You act fine? You deserve an acting award. I had no idea.', reaction: 'Ha, okay. Funny.' },
          { kind: 'pry', line: 'Did something happen, though? Like at home, or here?', reaction: 'Not really. I’d rather drop it.' },
        ],
      },
    },
    tooSoon: {
      3: 'Ha, yeah. I’d rather not think about it.',
      5: 'I’m fine, honestly. Let’s not make it a thing.',
    },
  },
  {
    id: 'open-moving',
    entry: { card: 'openup' },
    facts: 'Might have to move again soon, and doesn’t want to get attached to new friends who might end up leaving.',
    turns: [
      'I might have to move again. My parents said maybe this spring.',
      'Moving again? Like you’ve done it before?',
      'Yeah, we moved here last year too. I just got used to people, and now I might leave.',
      'Getting used to people and then leaving is hard. I’d probably hold back too.',
      'Yeah. I don’t want to get attached and then have to leave again, so I keep to myself.',
      'That makes sense. I’d still want to be friends, though, even if it’s just till spring.',
      'Okay. Till spring. Maybe longer, if we don’t move.',
    ],
    choices: {
      1: {
        wrap: { line: 'A lot to think about. Hope it doesn’t happen yet.', reaction: 'Thanks. Yeah, me too.' },
        misses: [
          { kind: 'aboutMe', line: 'Oof, that’s a lot. My family moved a bunch when I was little, so I’m kind of used to it.', reaction: 'Oh. Okay, cool.' },
          { kind: 'changeSubject', line: 'Do you know if the spring concert is open to everyone?', reaction: 'I think it’s just the band.' },
        ],
      },
      3: {
        wrap: { line: 'Hope you get to stay a while.', reaction: 'Yeah, me too. Thanks.' },
        misses: [
          { kind: 'brushOff', line: 'Don’t worry about it yet. It might not even happen, so enjoy now.', reaction: 'It’s still hanging over me, honestly.' },
          { kind: 'fix', line: 'Tell your parents how you feel. They might change their mind.', reaction: 'They already know. It’s not really up to them.' },
        ],
      },
      5: {
        wrap: { line: 'Glad you told me, at least. That’s a lot to hold.', reaction: 'I don’t tell a lot of people. Thanks.' },
        misses: [
          { kind: 'tease', line: 'So you’re basically a professional new kid now. Congrats.', reaction: 'Ha, thanks. Not really a title I wanted.' },
          { kind: 'pry', line: 'How many times have you moved? Like, total?', reaction: 'A few. I’d rather not count them out loud.' },
        ],
      },
    },
    tooSoon: {
      3: 'Hm, I don’t know yet. Let’s see.',
      5: 'I’m not sure about that yet.',
    },
  },
];
