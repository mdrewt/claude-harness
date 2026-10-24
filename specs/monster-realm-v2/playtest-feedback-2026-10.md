# Playtest Feedback

## System Notes

I prefer generalizable solutions over specific solutions. When examples or suggestions are made, consider if they are only a single part of a larger pattern or problem. Also, look at the feedback as a whole and consider if any parts are symptoms of larger issues. Try to implement and integrate systematic solutions that are modular/reusable and resolve even the cases that weren't explicitly mentioned instead of applying specific exceptions. I would like solutions to be well thought out, well designed, simple and cohesive. I want solutions to fix the problems without being too complicated, over-designed, or over-engineered. When it comes to how much work to put into fixes, improvements, refactors and re-designs, the quality of the final result takes priority over the quantity of work required to get there. I want this game to be both well-architected (easy to develop, reliable, scalable, and simple), and fun for the players (engaging, entertaining, intuitive, and appealing with good UI/UX).

Use your own judgement about what is best for the project. You are free to make suggestions, propose alternatives, and push back on anything you think might be a bad decision. However, do not do so silently. If what you think is best aligns with my suggestions, then you may go ahead and plan around that, but when you believe a different direction is best you should explain your reasoning, provide your recommendations along with any good alternatives, and wait for me to make the final decision. Create a list of these decision points as they come up and then group related ones into batches of 1 to 5 decisions. Raise each batch as its own issue in the `monster-realm` GitHub repo (one issue per batch of 1 to 5 related decisions, raising multiple issues when there are more decisions than fit in one batch), following the communication process laid out in the project harness's `mr-feedback-doctrine.md` and `feedback-triage.md` files (which reference `mr-ask-drew`, `mr-decision-watch`, and `mr-feedback`). Ensure that something is in place to find, retrieve and incorporate my decisions when I eventually make them. You should also read the previous playtest feedback (in the harness repo under `specs/monster-realm-v2/`: `playtest-feedback-2026-07.md`, `playtest-feedback-2026-07-r2.md`, and `operator-feedback-2026-10-01-controls.md`) and raise decisions if proposed designs would also go against those.

Consider industry standards and common conventions that are appropriate for this project. If changes need to be made to the UI design or layout, try creating a wireframe diagram of what a good design and UI flow would look like. The UI borrows some principles from reactive and responsive web design. Consider what elements should grow or shrink vertically, which should grow or shrink horizontally, which should scale with screen size/resolution, and which should remain relatively consistent. Then compare and contrast those wireframes to the current design, as well as designs used by similar retro-style 2D games in order to determine how the design can be improved. However, while you should use other sources for inspiration, you should not directly copy them wholesale or steal assets.

You should research the following games thoroughly in preparation for some of my suggested improvements to this project (their art styles, storytelling, UI design, and game mechanics can help inspire and direct the direction of the improvements I want to make):

- Soulbound Online: A browser-based pixel-art MMO with a fantastic art style. The main difference between `monster-realm` and Soulbound Online is that `monster-realm` is a turn-based monster-taming RPG, while Soulbound is an Action Adventure Roguelite. However, the `monster-realm` project is also a browser-based pixel-art MMO so there is a lot of opportunity to take inspiration from Soulbound's design.
- Sword of Convallaria: A pixel-art tactical RPG that also has a fantastic art style. The main difference between `monster-realm` and Sword of Convallaria is that `monster-realm` is a monster-taming MMO, while Sword of Convallaria is a hero-based RPG with single-player content and gacha-style mechanics. However, I want the `monster-realm` project to implement a similar style of tactical combat (using monsters instead of mercenaries/heroes), so there is a lot of opportunity to take inspiration from Sword of Convallaria's design. The things I DON'T want to take are any of the "pay to win", "microtransaction", or "gacha" mechanics.
- Final Fantasy Tactics Advance: A retro tactical RPG that is both iconic and nostalgic. The main difference between `monster-realm` and Final Fantasy Tactics Advance is that `monster-realm` is a top-down indie monster-taming MMO for the browser, while Final Fantasy Tactics Advance is a classic single-player isometric RPG for the GBA. However, I want the `monster-realm` project to implement a similar style of tactical combat (using monsters instead of mercenaries/heroes), so there is a lot of opportunity to take inspiration from Final Fantasy Tactics Advance's combat system and UI.
- TRIANGLE STRATEGY: Another tactical RPG that has an amazing art style and UI to draw inspiration from.
- Coromon Remastered: An indie turn-based monster-taming RPG inspired by Pokemon with a good art style. The main difference between `monster-realm` and Coromon Remastered is that `monster-realm` is an MMO for the browser that will have unique mechanics and a greater emphasis on story, while Coromon is a single-player game that stays much closer to its Pokemon-inspired roots. However, the `monster-realm` project was also heavily inspired by Pokemon and similar titles. While I hope to make `monster-realm` a little more distinct and unique, there is still a lot of opportunity to take inspiration from Coromon's gameplay and UI.
- Octopath Traveler: A retro-style JRPG famous for its "HD-2D" art style. Its lighting, shadows, and depth effects are a benchmark for the "2D-HD" art style I want `monster-realm` to aim for.
- Sea of Stars: A modern retro-inspired indie RPG with excellent pixel art, lighting, and environmental detail. Another benchmark for the art quality I want `monster-realm` to reach.

I conducted the playtest by running the `just playtest-up` command and ended the playtest by running both the `just playtest-down` and `just playtest-report` commands. So the playtest DB was the one used, and some of the events were compiled into a report.

## The Main Menu

This is the menu that the player can enter from the game world by pressing the virtual start button (Default Key: Esc).

### The Layout

- Menu
  - Monsters
  - Bag
  - Journal
  - Social
  - Profile
  - Options
  - Close

### The Good

- The main menu has a header that is visually distinct from the menu items using a visible border.
- The main menu has a "Close" menu item for easy navigation, even in the case where the player forgets about the other options such as the virtual B button and the virtual Start button.
- The main menu highlights which menu item is currently selected.
- Navigation works as intended with both the mouse and the virtual buttons (D-pad, start, A, and B).

### The Bad

- There is a visible footer in the main menu that is empty and unnecessary.

### Conclusion

It is a little basic and bare-bones, but it is functional and works as intended. Some ways to improve it might involve adjusting the alignment and layout of the elements, adjusting the text size (or allowing a setting that would scale the text size based on either user-preference or screen size), and removing the unnecessary footer.

---

## Party & Box Menu

This is the menu that the player can enter from the main menu by selecting `Monsters`, or with the "V" shortcut (opens the Party tab) or the "B" shortcut (opens the Storage tab). Both keys open the same overall menu screen, just with a different tab selected.

### The Layout

- Party Tab
  - Slots for Party monsters (Slot Quantity: 5)
    - Slot interaction menu
      - Summary
      - Care
      - Feed
      - Evolve
      - Nickname
      - Move
- Storage Tab
  - Slots for stored monsters (Slot Quantity: Variable)
    - Slot interaction menu
      - Summary
      - Care
      - Feed
      - Evolve
      - Nickname
      - Move

### The Good

- The `Party & Box` menu makes a minimum effort (could be better) to visually distinguish between the sections for the Menu title, menu tabs, and tab contents.
- The sub-menus for interacting with the player's current party and their stored monsters are separated using tabs.
- The tab labels are arranged horizontally, as expected.
- Navigation works as intended with both the mouse and the virtual buttons (D-pad, start, A, and B).

### The Bad

- There is a visual bug where a rectangular box is visible around the "Party & Box" menu title, and then disappears after clicking the mouse or removing the focus from the web page.
  - If the box is intentional, it is poorly positioned and the wrong size (too small) to contain the title. It also looks strange and can be visually confused with the border around an actively selected menu item.
- The tab labels are not a consistent height.
  - The `Party` tab always has 5 slots for monsters, so its height is constant.
  - The `Storage` tab may have a variable amount of monsters in it, so the label grows vertically to fit the available space.
  - The size of the tab label should not depend on the size of the tab's contents.
    - The tab labels/headers should all be a uniform height depending on the size needed to fit their contents. Similar to how table rows work.
  - The tab contents section should grow to fit the available space (up to a maximum size, even if it's empty).
    - For the `Storage` tab, having a lot of monsters may cause the section to exceed the maximum size. In this case, the overflowing contents should be hidden and those monsters should be reachable by pseudo-scrolling when the user uses the D-pad to navigate up/down the grid, selecting different monsters.
    - For compatibility with mice, support for the scroll wheel might also be a good idea.
- There is help/info text between the tab labels and the tab contents. Help/info text is good, but its location should not interrupt the layout. The text should either be moved inside the tab contents as part of the content layout, or be moved below the tab contents.
- Inconsistent terminology.
  - The main menu calls this submenu "Monsters", while the title in the sub-menu itself says "Party & Box". The names should be consistent. Since "Party" and "Storage" are already the names of the menu's tabs, I believe the name for this menu should be "Monsters".
  - "Box" and "Storage" are used interchangeably. There should be one consistent term. I think "Storage" is a better term than "Box".
- Redundant labels. When the "Party" tab is selected the tab contents also have a "Party" label. Same with the "Storage" tab. If the name of the tab is already clearly stated in the label, it doesn't need to be repeated in the contents.
- The menu itself grows to fit the whole screen, but the menu's tabs and contents do not. The outer menu should either shrink to fit its contents (plus margins/borders/padding), or the inner portion of the menu should grow to fit the available space (minus margins/borders/padding). Since the sub menus offer more data and interaction than the main menu, I am leaning toward a layout which allows the interior to expand to fit the available space.
- In both tabs, there is a miniature menu that appears when I interact with a slot containing a monster. This mini-menu has several issues.
  - When the menu is open, it prevents interactions with other monster slots and tabs until it is closed.
    - Clicking on another slot does nothing.
    - Clicking on another tab, or trying to navigate with LB or RB also does nothing.
    - For a menu like this, I would expect attempting to interact with a UI element outside of the miniature menu to close the miniature menu first, and then process the interaction (assuming it is appropriate to do so).
  - It does not have a visible border and it appears in an awkward location between the tab label and the tab contents.
    - I am not sure if the miniature menu should open over the selected slot, replace the selected slot while active, appear next to the selected slot, be its own page, some other option, or some combination of options. However, its current design and placement comes across as sloppy. Maybe it should behave more like a kind of fake modal or a dialog box?
  - It is unclear what the `Care` menu item is intended to do. When I interacted with it, nothing happened. If I am missing a resource, or if the care action is unavailable, then it should either be disabled (like the `Feed` action) or I should get some sort of message when I attempt to execute it.
  - While the B button works for backing out of the mini-menu, there should also be a `Back` or a `Close` option in the menu as well.
  - The `Move` menu item's functionality is duplicated by the `To Box` button in the party tab and the `To Party` button in the storage tab.
    - These buttons are not reachable if the player tries to navigate solely using the virtual buttons.
    - The `Move` action can be reached normally, but the `To Party` and `To Box` buttons can only be interacted with using the mouse.
    - No UI element should only be reachable by the mouse, even if a workaround exists. The mouse is not considered the primary method of interaction and this affects accessibility and future compatibility with controllers.
  - I am considering whether the miniature menu should be replaced by a smaller subset of buttons that appear in each currently selected slot and a new page specifically for showing an individual monster's details with the rest of the options. I think this would work well for the `Party` tab, because the slots are arranged as a list so up/down on the D-pad can switch the selected slot while left/right could select a button. However, the slots in the `Storage` tab are arranged in a grid instead of a list, so that solution won't work as well because all four directions are required for navigation.
  - Despite being the screen you are brought to when the `Monsters` option is selected, this page has no way of displaying all of a monster's stats. Players would have to go to the `Raising & Inventory` screen to see those. That information should be included in either the information contained in the monster's slot, or in its summary (or both).

### Conclusion

It is functional and works, but the UI and layout could be better designed. It is not clear which areas of the screen belong to which UI elements. Consistency, element sizing, and section placement should be considered more carefully, with appropriate changes being made.

---

## Raising & Inventory Menu

This is the menu that the player can enter from the main menu by selecting `Bag` or pressing the "I" shortcut.

### The Layout

- Monsters
  - Slots for the monsters in the party
- Inventory
  - Bait Tab
  - Food Tab
  - Medicine Tab
  - Other Tab

### The Good

- The `Raising & Inventory` menu makes a minimum effort (could be better) to visually distinguish between the sections for the Menu title, Monsters, and Inventory.
- Pressing the `care` button on this page shows a message with feedback telling the user if it worked or if the "care cooldown not yet elapsed".
  - While I like that the message exists, I don't like how it's designed. It looks similar to a flash message that appears on the top of the screen and it changes the location of the other UI elements. I think something similar to a fake modal or dialog box would work better, although conventions established by other games may have alternative suggestions.

### The Bad

- There is a visual bug where a rectangular box is visible around the "Raising & Inventory" menu title, and then disappears after clicking the mouse or removing the focus from the web page.
  - If the box is intentional, it is poorly positioned and the wrong size (too small) to contain the title. It also looks strange.
- The tab labels for the `Inventory` section are not consistent with other menus.
  - It is not obvious that the tabs containing different sections of the menu are actually tabs that require using `LB` and `RB` to navigate between.
  - Visually, the labels look like menu items, so my instinct is to try to select them using the virtual D-pad, which is not how they are intended to be interacted with and thus doesn't work.
  - They are aligned vertically instead of horizontally.
  - They are not near the top of the screen.
  - There is not a clear delineation between the item category tabs and the section containing the actual list of possessed items.
- This menu is trying to do two unrelated things.
  - It is showing a `Monsters` section with the option to "care" for them.
  - It is showing an `Inventory` section with tabs for different types of items.
  - The monster section should be removed since it duplicates the functionality in the `Party & Box` menu. This would make this just an "Inventory" menu with tabs for different item categories.
- The `Care` button's functionality is duplicated by the `Care` action in the Party & Box menu's miniature menu for individual slots.
  - These buttons are not reachable if the player tries to navigate solely using the virtual buttons.
  - The `Care` action on the `Party & Box` page can be reached normally, but the `Care` buttons in this menu can only be interacted with using the mouse.
  - No UI element should only be reachable by the mouse, even if a workaround exists. The mouse is not considered the primary method of interaction and this affects accessibility and future compatibility with controllers.
- Inconsistent terminology.
  - The main menu calls this submenu "Bag", while the title in the sub-menu itself says "Raising & Inventory". The names should be consistent. Since I think the `Monsters` section of this menu should be removed, I believe the name for this menu should be "Inventory" instead of "Bag".
  - "Box" and "Storage" are used interchangeably. There should be one consistent term. I think "Storage" is a better term than "Box".
- I have no items, so I cannot test item functionality. Every new player should either start with a few basic items, or enough starting money to buy some from the shop. This will help players get started faster and make testing easier.
- The "care" action hasn't come off cooldown since the first time I clicked it. I am unsure if there's a bug, the cooldown is (too) long, or if clicking the button again resets the cooldown by mistake. Additionally, there's no visual indication of how long the cooldown is, or if it's currently available.

### Conclusion

It is functional and works, but has a worse overall design than the `Party & Box` menu and needs work.

---

## Journal Menu

This is the menu that the player can enter from the main menu by selecting `Journal` or pressing the "J" shortcut.

### The Layout

- None

### The Good

- None

### The Bad

- The journal menu is a completely empty menu. I think that's because I haven't accepted any quests yet, but even in that case, there should still be a title, or a label, or tabs, or something. Instead it's just blank.
- I tried to accept a quest but wasn't able to.
  - The NPC that offers a quest runs around very fast and is hard to interact with. While players are impatient and like to run across the map to get to their destination faster, aimlessly wandering NPCs should move at a slower pace, walking and pausing for a second on each tile before moving to the next one.
  - When I do interact with the NPC he continues to move around the map even though I'm talking to him. NPCs should stand in place while a player is directly interacting with them.
  - When I tried to tell the NPC that I seek a quest I initially got a message saying "advance: walked too far away". I don't know if this meant that I was too far away, if the NPC walked too far away while I was talking to it, or if it means something else.
    - Messages should be clear and easy for the player to understand.
    - No quest was ever added to my journal. Even if the quest would require me to walk somewhere or do something before it was completed, asking for the quest should still have added it to my journal as "incomplete" or "in progress" with additional information.

### Conclusion

I could not confirm that it was functional and its design was lacking basic elements.

---

## Social Menu

This is the menu that the player can enter from the main menu by selecting `Social` and contains other menus reachable by pressing the "U", "P", and "L" shortcuts.

### The Layout

- Trades
  - Players Tab
  - Trades Tab
  - Challenges Tab
  - Rankings Tab
- Challenges
  - Players Tab
  - Trades Tab
  - Challenges Tab
  - Rankings Tab
- Rankings
  - Players Tab
  - Trades Tab
  - Challenges Tab
  - Rankings Tab

### The Good

- The tabs in the full-screen version of the menu seem to be aligned horizontally and have a consistent height, which is something other menus struggled with.
- Challenges, active trades, player rankings, and nearby players show up in their respective tabs.

### The Bad

- Another visual glitch similar to the previously mentioned one occurs where a box is outlining the three options in the social menu and disappears when the mouse is clicked. This glitch also occurs in the `Trades` and `Challenges` tabs in the sub menu.
- Inconsistent behavior. The other menu options bring me to a new menu represented by a full screen page, but selecting `Social` re-uses the box surrounding the main menu to display three different choices instead of taking me to a new screen. Then each of those three options do take me to a full-screen menu, but they're all just the same menu with a different tab selected.
  - The other pages should either be their own page, reachable by one of the main menu's sub-menu options, or the `Social` option should take me directly to the full-screen menu with the four tabs and a default initial tab displayed.
- When offering trades you can't view the other player's monsters. That information is restricted by the server: a player can always read their own information, but another player's information is only shared with your client when a feature needs it to function (like displaying your opponent's active monster in a battle). This is to prevent players from gaining a competitive edge by learning what monsters a player has before the battle begins. However, it means that the trading flow is broken and needs to be changed.
  - Instead of the current flow (where one player proposes a trade and another accepts or declines it), the new flow should have multiple stages and start with a player initiating a blank/empty trade.
  - After a trade has been initiated each player modifies the trade by adding or removing what they're offering from their own side of the trade.
  - When a player is satisfied with both sides of an offered trade, they can confirm the trade and stop making changes.
  - If the trade offer is changed by a player who has not yet confirmed the trade, then any other participating players' confirmation status is reset so they can review the changes before agreeing.
  - The trade is only finalized and executed when all involved players have reviewed and confirmed the trade.
  - Any trade that has not been executed may be cancelled by either player. Executed trades are final and would require the players to start a new trade to undo a previous one.
  - Monsters can only be in one active trade at a time, must have at least 1 HP, and must be in the player's party to be traded.
    - In order to offer the monster in a new trade, the old trade must be cancelled.
    - If the monster is moved out of the player's party, or falls below 1 HP, any active trades it was part of are cancelled.
    - Players cannot confirm any offer if one side of the offer is empty. This is to prevent soft-lock states like trading away your only monster.
  - This allows players to trade without having access to a list of everything owned by another player. It also allows both sides to review the trade before confirming it, ensures that the players currently own the monsters they are offering, and tries to avoid some soft-lock states.
- The trade UI listed things other than monsters (implying they were tradable) but only allowed me to actually add monsters to the trade offer.
- Each active trade in the `Trades` tab should be its own UI component that takes up its own row (similar to how challenges are listed). Currently there is no visual separation between different trade offers.
- I like that players can choose whatever name they want, but if names are not unique then the `Players` tab in the `Social` menu could fill up with multiple players using the same name, and no way for another player to determine who is who.
  - Some additional information (beyond their chosen name) should be displayed in the list of online players.
  - One option to allow players to differentiate each other is to use a username strategy similar to Discord's, where a player-specific suffix/ID is appended to the end of whatever name they choose.
    - The ID would be unique and persistent, even if the player changed their character's name.
    - In many cases (Battles, name tags, NPC dialogue, etc...) the ID could be omitted for the sake of immersion, while in other cases (chat, trade requests, friend requests, etc...) it can be displayed along with the name (but with a lower contrast) for specificity.
- The padding and margins across contents of the four tabs in the `Social` menu are inconsistent, which looks sloppy.
- The `Rankings` tab lists every ranked player except the currently selected one with a bullet point. I think it looks better if the unselected players do not have a bullet point. Additionally, there is no available interaction when a player's ranking is selected, so why are they even selectable? If it's for scrolling purposes, is there a better way?
- Similar to previous menus, there are UI buttons that are only reachable using the mouse, not the virtual buttons.

### Conclusion

It feels like the layout of each menu is subtly different from all the others instead of sharing and re-using the same set of components. This makes all the menus feel inconsistent. They still need some polish work.

---

## Profile Menu

This is the menu that the player can enter from the main menu by selecting `Profile` and contains other menus reachable by pressing the "N" and "C" shortcuts.

### The Layout

- Name
  - Rename
- Account
  - Sign In
  - Decline
  - Privacy & Account Data
- Privacy
  - Close
  - Delete My Account
  - Cancel Account Deletion
  - Request my data export
  - Download My data export

### The Good

- The menus are readable and functional.

### The Bad

- Another visual glitch similar to the previously mentioned one occurs where a box is outlining the options in the profile menu and disappears when the mouse is clicked.
- Inconsistent behavior. The other menu options bring me to a new menu represented by a full screen page, but selecting `Profile` re-uses the box surrounding the main menu to display three different choices instead of taking me to a new screen. Then each of those three options do take me to a full-screen menu, but the three menu screens are sparsely populated and feel vacant.
  - This is similar to the `Social` menu, but that has the additional problem of all three options taking you to the same screen. At least these are different menu screens. However, it's possible that they actually should be combined.
  - All three screens relate to the player's account (the account character's name, account authentication, and account data). Since they're related, it might make sense to combine them into one screen with three sections. Then the middle navigation menu could be removed and the `Profile` option in the main menu would lead directly to the combined screen.
- I like that players can choose whatever name they want, but if names are not unique then the `Players` tab in the `Social` menu could fill up with multiple players using the same name, and no way for another player to determine who is who.
  - One option to allow players to differentiate each other is to use a username strategy similar to Discord's, where a player-specific suffix/ID is appended to the end of whatever name they choose.
  - The ID would be unique and persistent, even if the player changed their character's name.
- The `Name` and `Account` screens lack a menu title.
- The `Account` screen has a "Sign In" button, but no way to register. How is anyone supposed to use the "Sign In" button if they can't first register an account?
- The `Account` screen has a button leading to the `Privacy & Data` screen, which is redundant since there was already an option leading to that screen in the previous menu.
- The buttons in the `Account` screen are aligned horizontally, but selected using the up/down buttons on the virtual D-pad. The button directions used to select components should correspond to their layout/alignment/orientation.
- On the `Privacy & Account Data` screen, the `Close` option is at the top. If a close/back option is in a menu, it should be located at the bottom. (The "X" button commonly used for exiting an application window is a different kind of UI element, distinct from a game menu's "close" option.)

### Conclusion

It still feels like the layout of each menu is subtly different from all the others instead of sharing and re-using the same set of components, but the `Profile` menus are more consistent than the `Social` menus. They still need some polish work.

---

## Options Menu

This is the menu that the player can enter from the main menu by selecting `Options` and contains other menus reachable by pressing the "R" shortcut.

### The Layout

- How to play
  - This Screen
  - All Controls
  - Goals
- Controls
  - Buttons
  - Shortcuts

### The Good

- The menus are readable and functional.
- Other than the layout issues, I actually like the `Controls` screen and the way it lets you customise the keybindings or reset them back to their defaults.

### The Bad

- Another visual glitch similar to the previously mentioned one occurs where a box is outlining the options in the options menu and disappears when the mouse is clicked.
- Inconsistent behavior. The other menu options bring me to a new menu represented by a full screen page, but selecting `Options` re-uses the box surrounding the main menu to display two different choices instead of taking me to a new screen. Then each of those options does take me to a full-screen menu, but there is a lot of overlap and redundancy between the different menu screens.
  - The `How to play` option has a tab for controls, but that need is already fulfilled by the `Controls` menu screen, we don't need both. I think the `All Controls` tab should be removed.
  - Since the middle (navigational) sub-menu only has 2 options (`How to play` and `Controls`), those menu options should each be added to the main menu as options instead of being a separate sub-menu.
- Inconsistent naming. The `How to Play` option leads to a screen called `Controls & Goals`. `How to Play` is a better name for this screen.
- The `This Screen` tab in the `Controls & Goals` screen is blank. I think that tab should be renamed to something like `Introduction` or `About Us` and contain a couple of paragraphs of text introducing the game to new players, kind of like the blurbs written on the back of books to entice potential readers without giving away spoilers.
- Instead of a simple `Goals` tab that only has three bullet points in it, I think it would be better if it was changed into an encyclopedia tab containing a list of every special in-game term and game mechanic. When a player selects an entry in the list, something similar to a modal or a dialog box appears above the menu screen with the definitions and details about any related game mechanics.
  - Like the established conventions for menu navigation, pressing the virtual `B` button would close the pseudo-modal, bringing you back to the encyclopedia tab in the menu.
- The tab labels are not a consistent height in the `How to play` screen.
  - The `This Screen` tab, `All Controls` tab, and `Goals` tab labels grow vertically to fit the available space.
  - The size of tab labels should not depend on the size of the tab's contents.
    - The tab labels/headers should all be a uniform height depending on the size needed to fit their contents. Similar to how table rows work.
  - The tab contents section should grow to fit the available space (up to a maximum size, even if it's empty) and allow some kind of pseudo-scrolling for content overflow.
- In the `Controls` screen the two tab labels (`Buttons` and `Shortcuts`) are vertically aligned instead of laid out horizontally.
- The `Controls` screen doesn't have a shortcut, but it's probably more deserving of a shortcut than some of the other screens that already have one.

### Conclusion

Similar issues as the other menus, still needs some polish work.

---

## Battle Menu

This is the menu that the player enters when they encounter wild monsters and try to fight or recruit them.

### The Layout

- Opponent Monster
  - Level
  - Health
  - Type
- Your Monster
  - Level
  - Health
  - Type
- Fight
- Recruit
- Swap
- Run
- Move list
- Flee
- Swap
- Bag
- Bait

*(The duplicated `Swap` entry and the overlapping `Run`/`Flee` entries above are real, not a transcription error — see The Bad below.)*

### The Good

- The menu is readable and functional.
- I like the red and green info boxes that show information (Name, Level, Health, Type) about my monster and my opponent.
- The health bar is good.
- All the necessary actions are present.
- Invalid actions (like `Bag` when you don't have any items) are visually disabled.
- All currently built features are working and I can battle and recruit different monsters that earn XP and level up.

### The Bad

- The graphics are extremely bare-bones and the layout is very basic.
  - Both monsters are only represented by boxes of information and text, not sprites. The monsters should have sprites. A shared placeholder asset for all monsters will do temporarily, until a professional artist can be hired.
  - There is no background image to show the battlefield or the terrain. Ideally, there would be different artwork for battles taking place in different locations, which the monster sprites would then be positioned on. A shared placeholder asset for all battles will do temporarily, until a professional artist can be hired.
  - There is no animation of any kind accompanying the actions taken by either player.
  - The boxes representing the monsters are simply stacked on top of each other.
  - There is no visual distinction between the part of the screen that the monsters are in, doing battle, and the part of the screen where the menu options and the controls are.
  - Everything remains the same size, no matter how big my screen is (resolution-scaling).
  - There are redundant buttons for Run, Flee, and Swap.
  - Almost all the buttons are present on the screen at the same time. Instead, there should be a floating battle menu with general options that gets swapped out for a menu containing more specific options depending on your selection (like those used in turn-based games such as Pokemon Ruby, Coromon, Beloved Rapture, Final Fantasy VI).
    - The list of attacks should not show up until `Fight` is selected.
    - The list of bait should not show up until `Recruit` is selected.
    - `Swap` should let you choose any monster in your party from a menu.
    - Etc... (These may change depending on the combat redesign).
- The combat itself is a little simplistic and boring.
  - Instead of Pokemon-style combat where it's mostly 1v1 battles without any kind of positioning, I want to move toward a style of combat closer to "Sword of Convallaria" and "Final Fantasy Tactics Advance".
    - A battle map made up of tiles where each side has multiple units that take turns acting.
    - I want to start simple with the new battle system and gradually add new features and mechanics.
  - The battlefield should be made up of tiles and be large enough for each side to deploy 1-3 monsters at the same time (2-6 monsters total) with enough room for them to position and maneuver.
    - The tiles may or may not have obstacles (a future feature) that impair or block movement and provide cover from ranged/AOE attacks.
    - The tiles may be different heights (a future feature), which may add an elevation bonus on some types of attacks.
  - Attacks should have a range, an origin, a target, and an area-of-effect (line of tiles, cone of tiles, radius of tiles).
    - For example, a monster unleashes an explosive fireball at a distant tile and damages everything near where it lands. The fireball is the attack, the origin is the monster, the target is the distant tile, the range is the maximum distance allowed between the origin and the target, and the area of effect is the group of tiles around the target that takes damage.
    - Attacks with a range of zero would only target the origin's tile (targeting themselves), while a range of 1 would target adjacent tiles (melee attacks), and any range greater than 1 would be a ranged attack.
    - Similarly, an attack with an area-of-effect of radius 0 would only affect the target tile, radius 1 would affect both the target tile and adjacent tiles, and larger radiuses would affect even more tiles.
    - Attacks with line and cone areas-of-effect (a future feature) would work a little differently, since they would also have a propagation direction/orientation.
  - Monsters should get a certain number of action points that they can spend each turn to do different actions. The cost of the actions should follow relatively consistent guidelines.
    - The cost of moving depends on the distance moved, the type of terrain (for example: water vs land), the monster's type (for example: aquatic vs terrestrial), and the monster's speed stat.
    - The cost of an attack depends on how powerful it is. Powerful attacks are more expensive than weak attacks, but one powerful attack should be more cost-efficient than multiple weak attacks for the same amount of damage.
    - Using an item should cost somewhere between a weak and strong attack, but the cost should be the same no matter which item is used. This is balanced by the price of the item (in the game's currency) and by using up the item permanently. Many items will also be usable outside of combat, where they will work normally (not requiring action points).
    - A monster's full turn's worth of action points can be used to make a recruitment attempt on an adjacent wild monster (not another tamed monster and not during PVP). Using bait helps the attempt's success rate, but does not increase the action point cost.

### Conclusion

This game's combat system will be one of its cornerstone gameplay elements, making it super important to get right. It has to be fun, interesting, novel, and rewarding to its players or else the game will not be successful. I would like to overhaul this UI and the related battle system more than anything else, taking heavy inspiration from tactical RPGs like Sword of Convallaria, Final Fantasy Tactics Advance, and TRIANGLE STRATEGY. I think there's potential for great synergy between the tactical RPG and monster-taming genres that can really make this game stand out and attract attention if implemented properly.

---

## The Game Map

### The Good

- The map has enough placeholder assets that I can test most of the current set of core gameplay mechanics.
- I can walk around while finding, battling, and recruiting monsters.
- The virtual buttons are working well.
- I like the control hints located at the bottom of the screen.
- The map reacts to changes in the window size, scaling when the window grows and shrinks.

### The Bad

- The placeholder sprites and tilesets are extremely basic. They're good enough for development, but nowhere near the quality of the art styles this project is inspired by (Soulbound Online, Octopath Traveler, Sea of Stars, Coromon) and will need serious work before an actual release.
- There is one tile at the bottom of the map that causes the wandering NPC to disappear and the shop-keeping NPC to appear instead. Walking back over this tile reverses the change. It is not obvious to the player what is going on, which makes it look like a bug.
- The wandering NPC moves around too much, too rapidly.
  - He also doesn't stop moving when you are actively interacting with him. NPCs should not wander away mid-conversation.
  - I also was unable to determine if his quest worked properly, or even if it did anything at all. I kept getting a "walked too far" message.
- I did not have enough currency to buy anything from the NPC shopkeeper and I have no method of earning more of the game's money.
- When a second player joined, their movement was jerky instead of smooth on the first player's screen, like they were pausing on every tile even though the second player was holding down the directional button continuously. I want character movement to look smooth, regardless if it's the player's own character or a different player's character.
  - I think this is a flaw in the netcode and the client's predictor.
  - If a player's last known action was walking in a certain direction and the client doesn't receive any new information, the client should assume the character will continue attempting to walk in that direction and predict accordingly.
  - The server continues to be the source of truth and conflicting states should defer to the server. This is only about when a character is taking an action and the client was not informed of any changes in behavior prior to the prediction.
  - There should be a short time period since the last update for the character where this is allowed. If the client still doesn't receive any updates about that character after the time period has elapsed, then the character is treated as idle/paused (ending their previous actions).
- There's apparently a "water" tile that heals monsters. That has several issues.
  - To me, "heal points" are landmark locations, like a Pokecenter in Pokemon. They might be located on a tile, but there was no reason to decide that all water tiles are healing tiles. That seems like either a gross misunderstanding or a misrepresentation of what the heal-point decision was supposed to mean. Healing is necessary (especially while testing), but it shouldn't happen because of a random tile on the map.
  - As a separate issue, the water tile's placeholder art is indistinguishable from the grass tiles.
- The map is pretty small. It would be good to have a larger one with more variety.
- There is only one map. I need another to test traveling between areas.
- The UI seems like it's following reactive design principles instead of responsive design principles. It looks like it's scaling by snapping between a few pre-defined sizes instead of smoothly growing and shrinking continuously to fit in any size window.
  - After further testing, there appear to be multiple scaling methods implemented instead of using a cohesive methodology. The Overworld map snaps between sizes, but the main menu grows and shrinks smoothly.
- I would like to be able to change the direction I'm facing without actually moving. This is necessary because sometimes you have to face a certain tile in order to interact with it, but moving would make you interact with something else. I think that before you move in a direction, you should be required to face that direction. Turning to face a new direction should take just long enough that quickly tapping a direction on the D-pad will make you turn, but not start walking yet. However, if you are already facing the intended direction, then tapping would just make you start walking forward.

### Conclusion

The assets, graphics, and UI will all need an upgrade soon in order to reach the target level of art quality before a production release. While a professional artist will be hired to do the final artwork, a lot of the desired graphical milestones require higher quality placeholders in order to continue development. Without these it is difficult to design new maps and areas, create cutscenes, work on story-related events, special effects, shaders, and other things. Higher quality placeholders are also needed to test features for the desired "2D-HD" art style (shadows, lighting, texturing, etc...).

---

## Verdict

- [ ] PASS — proceed to post-gate queue as planned
- [x] PASS WITH CHANGES — reshape queue per notes below
- [ ] FAIL — pause Phase D; remediation milestones first

Overall, this was a significant improvement over the previous playtest. The control changes were good and the UI changes were a step in the right direction, but they still need a lot of work.

In some menus, it is not obvious that the tabs containing different sections of the menu are actually tabs that require using `LB` and `RB` to navigate between. Visually, they look like the rest of the menu, so my instinct is to try to select them using the virtual D-pad, which is not how they are intended to be interacted with and thus doesn't work. I think this UI issue can be resolved by making the tab labels visually distinct from their contents. Here are some of the common techniques that I know:

- Making good use of visual elements. For example, horizontal lines, boxes, or borders to block out and separate the menu into clear sections.
- Making good use of typography. For example, different font sizes (or weights) to make titles, headers, and labels distinct from each other and regular text.
- Using good layout and organization. For example, having the tab labels laid out horizontally (instead of vertically) above the section for the tab contents.
- Using color, contrast, and value well. For example, a slightly darker background color on some types of elements to make tabs and buttons visually distinct. Or lowering the contrast of text/menu items that are disabled or aren't selectable (similar to graying-out).
  - The UI is already changing the background color to designate what is currently selected, which is a good first step.

I think the menus need to take advantage of shared, re-usable, and modular code because they seem very inconsistent at the moment. I have found some libraries that might be useful for improving the UI. However, I have not thoroughly researched all of them. They will need to be researched and vetted to find out which ones will be genuinely useful and how to use them. If any of these would not be useful, they may be excluded from the project. The libraries I found are:

- `@assetpack/core`: This tool organizes, packages, and loads assets efficiently, reducing load times and improving resource handling. (URL: `https://pixijs.io/assetpack/`)
- `@pixi/react`: A thin wrapper around Pixi.js, allowing it to be expressed via JSX (or TSX). (URL: `https://react.pixijs.io/`)
- `@pixi/layout`: Built on top of Facebook's Yoga Flexbox layout engine, it assists in creating dynamic UIs, responsive game interfaces, and fluid application components inside PixiJS. (URL: `https://layout.pixijs.io/`)
- `@pixi/ui`: A library that contains commonly used UI components, that are extensible to allow them to be used in any project. (URL: `https://github.com/pixijs/ui`)
- `@pixi/tilemap`: This package provides a low-level rectangular tilemap implementation, optimized for high performance rendering and an out-of-the-box canvas fallback. (URL: `https://github.com/pixijs-userland/tilemap`)
- `pixi-filters`: An extensive collection of high-performance effects includes options like blur, glow, god-rays, and color adjustments, providing the tools to create visually stunning graphics. (URL: `https://github.com/pixijs/filters`)
- `@pixijs-userland/spine-layout`: A spine composition framework built on Pixi.js. It lets you assemble flexible scenes with Spine skeletons, and provides a powerful animation system with minimal code. (URL: `https://github.com/pixijs-userland/spine-layout`)
- Spine Runtimes: The Spine Runtimes which are needed to use Spine 2D skeletal animation data with various game toolkits. (URL: `https://github.com/EsotericSoftware/spine-runtimes/tree/4.2`)

Work needs to be done immediately to overhaul and redesign the battle system. This is a high priority task which should be scheduled immediately after any bug fixes and low-hanging fruit. After that, milestones should be created to address all the other issues mentioned in the "bad" sections of my feedback.
