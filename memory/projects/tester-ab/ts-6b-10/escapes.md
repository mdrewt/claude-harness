# Shadow tests failing after the lens fixes: ts-6b-10

Each is a test written blind from this slice's criteria that fails against the current tree. Rule on each: a real defect in the implementation is fixed through the normal lens-fix path; a wrong test needs no action.

For each one that is a real defect: fix the defect. Add at most ONE test for it, the smallest that catches it, and prefer extending an existing test to writing a new one; add none if the gating tests already catch it after the fix. Put the trailer `AB-Adopt: <its id>` (the `k...` heading in the file) on the fix commit.

## k1197ecc09b

```
  it('CTL8D-2-BOOT-RESPOND: with an incoming challenge, P then A opens a sheet Accept, Decline on Accept; Down, A on Decline asks the catalogued question with No selected and sends nothing; A on No closes the prompt and still sends nothing; A on Decline again, Up to Yes, A sends exactly one declineChallenge for that challenge; A, A on the request then sends one acceptChallenge with the party ids; and with a trade session waiting for the player U lands on its row in #trade-sessions and A opens its editor over Social with no sheet and nothing sent', async () => {
    // WRONG IMPL KILLED: the legacy adapter (A does nothing on the Social frame); a sheet that
    // opens on Decline, or with a single action; a Decline that sends at once (skips the prompt)
    // or whose prompt defaults to Yes; a No that declines anyway; an Up that does not reach Yes;
    // a decline sent twice, as acceptChallenge or cancelChallenge, or for another id; an Accept on
    // the sheet sent without the player's party ids (the reducer would start a battle with no
    // team); a session row that opens a sheet, sends a reducer call or marks the cursor on
    // `#trade-status`; and an A on it that leaves the stack as it was (the editor unreachable).
    // Social opened by U or P sits over the menu (`[world, menuView, social]`, `expectSocialOn`);
    // an incoming challenge opens nothing by itself.
    await bootReady();
    server(1000);
    opts.store.upsertMonster(partyMonster(PARTY_MONSTER_ID));
    server(1010);

    // --- a challenge: Decline asks Yes / No, No first -----------------------------------------
    opts.store.upsertChallenge(incomingChallenge(CHALLENGE_ID));
    server(1100);
    // ctl-13 (named intentional change, CTL13.2): the incoming challenge opens nothing.
    expect(stackNow(), 'precondition: the incoming challenge opened nothing').toEqual([
      WORLD_FRAME,
    ]);
    press('KeyP', 1200);
    expectSocialOn('P', 'challenges');
    expect(cursorMark(el('pvp-challenge-incoming')), 'P: the cursor is on the request').toEqual(
      MARKED,
    );
    expect(sheetShown(), 'P: no sheet at the open').toBe(false);
    expect(promptShown(), 'P: no prompt at the open').toBe(false);

    H.calls = [];
    press('Enter', 1210);
    expectAnswerSheet('A on the request', 'accept');
    expect(promptShown(), 'A on the request: no prompt yet').toBe(false);
    press('ArrowDown', 1220);
    expectAnswerSheet('Down', 'decline');
    press('Enter', 1230);
    expectDeclineChallengePrompt('A on Decline', 'no');
    // ts-6b-10 (named intentional change): the prompt is the confirm variant of the one sheet
    // root, so the list rows are not beneath it. Was: `expectAnswerSheet('the sheet beneath the
    // prompt', 'decline')`.
    expect(sheetShown(), 'the prompt replaces the list in the one sheet root').toBe(false);
    await flush();
    expect(H.calls, 'A on Decline only asks: nothing is sent').toEqual([]);

    press('Enter', 1240);
    expect(promptShown(), 'A on No closes the prompt').toBe(false);
    expectAnswerSheet('after No, the sheet stays on Decline', 'decline');
    await flush();
    expect(H.calls, 'No sends nothing').toEqual([]);

    press('Enter', 1250);
    expectDeclineChallengePrompt('A on Decline again', 'no');
    press('ArrowUp', 1260);
    expectDeclineChallengePrompt('Up', 'yes');
    await flush();
    expect(H.calls, 'moving to Yes sends nothing').toEqual([]);
    press('Enter', 1270);
    await flush();
    expect(H.calls, 'A on Yes declines that challenge, once').toEqual([
      { name: 'declineChallenge', args: { challengeId: CHALLENGE_ID } },
    ]);
    expect(promptShown(), 'after Yes: the prompt is gone').toBe(false);
    expect(sheetShown(), 'after Yes: back to the list').toBe(false);

    // ts-6b-10.2 booted: a fresh Up from Accept wraps to the Back row; A on Back closes the sheet
    // and sends nothing.
    H.calls = [];
    press('Enter', 1272);
    expectAnswerSheet('A on the request, for Back', 'accept');
    press('ArrowUp', 1274);
    expectAnswerSheet('Up wraps to Back', 'back');
    press('Enter', 1276);
    await flush();
    expect(sheetShown(), 'A on Back closes the sheet').toBe(false);
    expect(promptShown(), 'A on Back asks nothing').toBe(false);
    expect(H.calls, 'A on Back sends nothing').toEqual([]);
    expect(
      cursorMark(el('pvp-challenge-incoming')),
      'A on Back: the cursor stays on the request',
```

Failure output:

```
A on the request: the sheet shows: expected false to be true // Object.is equality

AssertionError: A on the request: the sheet shows: expected false to be true // Object.is equality

- Expected
+ Received

- true
+ false

 ❯ expectAnswerSheet src/ui/screens/socialScreen.boot.test.ts:576:53
 ❯ src/ui/screens/socialScreen.boot.test.ts:717:5
```
