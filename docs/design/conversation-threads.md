# Conversation threads

**Status: built in the simulator, with a 20-thread pilot for review.** The playable game doesn't use
it yet. Rob chose this design (threads are the game); the details below are for review.

**Summary.** A thread is a canned conversation with one deep path and exits. The deep path is what a
good friend-building conversation looks like: notice what they said, ask about that, share a little
back, and don't go deeper than the friendship allows. Because going deeper pays more, the lesson is
the strategy.

## Why

Part of the point of the game is showing kids what good conversations look like, so conversations
that are obviously fake don't teach. Phrase pools couldn't do it: lines connected, but 83% of
exchanges ended within two lines, because nothing paid for staying with someone.

## How it plays

1. **Someone brings something up.** Talk about a hobby, Open up, or Get to know them (the question
   starts it). If it's true of that person, it starts their thread.
2. **A friend can follow it.** Each time it's their turn, the Respond card offers four lines:
   - **go on:** notice it, ask about that, or share a little back;
   - **wrap:** a kind place to stop, which is also a good move;
   - **two misses:** believable lines that break the flow, such as making it about you, advice nobody
     asked for, or cheering them up in a way that dismisses it.
3. **The owner answers,** and the path goes a step deeper. Playing any other card leaves the thread.
4. **An exit gets the owner's reaction,** so you feel what happened without being told.

**The four lines don't say which is which.** The card prints the rule (going on pays more the deeper it
goes, wrapping pays a little, missing costs), but not which line is which, and they are shown in a
shuffled order. Printing each line's effect would give away the answer, and telling them apart is the
skill the game teaches. This is the one exception to "every card prints exactly what it does".

## The numbers

All in `THREAD` in `src/cards/rules.ts`.

| Turn | Who | What | Bond | Needs |
| --- | --- | --- | --- | --- |
| 0 | owner | brings it up | the card's own effect | — |
| 1 | friend | asks about that | +1 | — |
| 2 | owner | a real answer | +1 | — |
| 3 | friend | goes deeper | +1 | Bond 3 |
| 4 | owner | the truth underneath | +1, deep | — |
| 5 | friend | gets it, gives a little back | +2, deep | Bond 7 |
| 6 | owner | a warm ending | +2, deep | — |

- **Wrap:** +1.
- **Miss:** −1, or −2 at turn 5, when they've just told you the most.
- **Too soon** (going on without the Bond for it): −1, and the owner deflects. You can try again
  another day.
- **Turns 4 and 5 are each person opening up to the other,** in an intimate setting, and each uses
  that person's one Open up for the week (an Open up thread was paid for by the card). So a whole
  thread is one way two people become Friends. With none left the conversation still goes on and still
  pays, but it can't take you past Friendly. Without this limit, students averaged 6.8 friends.
- **Two people have each conversation once.**

## The content

- **Canned and pre-computed.** The threads are data in `src/cards/threads.data.ts`. Nothing calls a
  model while the game runs, and there is no generation code in the repo.
- **How it's written:** by a Claude Code Haiku subagent working to a style guide, then a structural
  check, then a person reads it. The same checks run as tests.
- **One wording per turn.** Variety comes from more threads. Interchangeable wordings don't compose:
  a later line ends up mentioning a detail only one wording had.
- **Each student owns threads as facts about them,** so they tell the same story to everyone.
- **The friend's lines claim nothing about the friend,** because any student can be cast.
- **Too big for a friend to fix:** the best line gently asks whether there's an adult to talk to.

## Approaches considered

1. **Words only:** threads fill the phrase pools and the rules don't change. Rejected: conversations
   stay two lines long and teach little.
2. **Threads are the game** (chosen).
3. **A general graph** where any line branches. Rejected: it grows exponentially with depth, can't be
   reviewed, and has no clear lesson.

## Before scaling

- Read the pilot: `pnpm threads` prints every thread with its exits.
- With one thread per hobby, everyone into soccer has the same story. Around 300 threads fixes that.
