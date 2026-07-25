# Playtest Report

This is a report reflecting my experience while playtesting the `monster-realm` project. It should be reviewed in order to discover existing issues (both systemic and acute), pain points, things that need to be improved, and potential bugs. Feedback from this report should be used to improve the overall project as well as the process used to develop it. Additionally, postmortems should be performed on discovered issues to determine what factors led to their occurance and a retrospective to determine if any systemic changes to the development process can prevent similar issues from ocurring in the future. Sections of this report were written in a "stream of conciousness" style with new information being added as it was discovered (without updating older information). Keep this in mind if you find information that seems to conflict.

## Stage one: Setup

I began by attempting to setup and run the `monster-realm` project by using the `just playtest-up` command and immediately ran into issues. The `just playtest-up` command failed and produced the following output:
```
spacetime build --module-path server-module
    Finished `release` profile [optimized] target(s) in 0.03s
Optimising module with wasm-opt...
Could not find wasm-opt to optimise the module.
For best performance install wasm-opt from https://github.com/WebAssembly/binaryen/releases.
Continuing with unoptimised module.
Build finished successfully.
    Finished `release` profile [optimized] target(s) in 0.03s
Optimising module with wasm-opt...
Could not find wasm-opt to optimise the module.
For best performance install wasm-opt from https://github.com/WebAssembly/binaryen/releases.
Continuing with unoptimised module.
Build finished successfully.
Uploading to http://127.0.0.1:3000 => http://127.0.0.1:3000
Checking for breaking changes...
Error: error sending request for url (http://127.0.0.1:3000/v1/database/monster-realm-playtest/pre_publish?pretty_print_style=AnsiColor&host_type=Wasm)

Caused by:
    0: client error (Connect)
    1: tcp connect error
    2: Connection refused (os error 111)
error: recipe `playtest-up` failed with exit code 1
```

After some investigation, the error occured when the just recipe tried running the `spacetime publish -s "$STDB_SERVER" --module-path server-module -y "$MR_PLAYTEST_DB"` command without first checking to see if an instance of SpacetimeDB was running locally. I resolved this by manually starting SpacetimeDB with the `spacetime start` command. This allowed me to start the project and begin actually playing the game.

## Stage two: Initial impressions

Once I navigated to `localhost:4173` I was able to interact with the game's UI on the front end. My initial impression was that the textures were extremely simplistic and the map was very small. The one NPC that starts in the lower right corner was present and successfully moving around the map, however it moved in very jerky stops and starts that were too quick. I believe the NPC's standard movement speed should be a little slower, and its pathing should be smoother if possible. Additionally, both the NPC and Character's sprites seem to randomly change color. It is confusing and not obvious if this is intentional or a bug. I think the player's sprite should have a consistent design and the NPC's sprite should have a different design from the player in order to keep them visually distinct from each other.

The game's map also remains the same size regardless of the browser's window size. In web design there's a concept called "responsive design" where elements on the page automatically resize to fit the size of the viewport. I believe that a similar technique should be used here. The game should set a constant that determines how many game tiles wide the game's screen should be, and how many game tiles tall it should be (the screen renders different parts of the map as the play moves, attempting to keep the player in the center of the screen as their sprite walks around the map. The sprite getting too close to an edge of the map is a special case outlined in the ADRs and milestone documents). The frontend should use these constants, along with the hight and width of the browser's viewport to calculate a "scaling factor" that is applied to everything the UI renders (sprites, tiles, grids, movement, etc...). This should allow the gamee's screen to grow or shrink to the size of the browser in sync with all of the elements rendered inside the game screen.

There is also no help text or instructions of any kind, which make determining the controls very difficult. The frontend should promote a good user experience by having a section of the page listing/explaining the keybinds/controls. UI/UX is something that can be greatly improved overall.

## Stage three: Player movement

After forming my initial impressions, I attempted to move the player's sprite around the map using the WASD keys. I can only describe the movement as "slippery". Quickly tapping one direction often sent the sprite moving multiple tiles when I had intended to only move a single tile in that direction. Holding a direction and then releasing often resulted in a "stutter" where the sprite would briefly pause on the intended tile, and then proceed to move one tile farther. These movement issues are undesireable. Ideally the character's movement should feel responsive to player inputs, stopping where intended on button release and not double-moving. At one point I encountered a battle and my sprite continued walking another tile right out of the grass area. I am unsure what is causing these issues. Are certain events being read (or sent) twice? Is there some sort of offset or misalignment issue where the visual center of a tile is not the same as a grid/coordinate point? Is there some sort of timing issue where the initial movement is treated as if it was instantanious? Is there an "off by one" type issue going on? This need deeper investigation since movement has a large impact on the game's playability. Additionally, there is no visible walk animation (possibly because the sprite is so simple) and the player's walk speed is also a litle too fast.

One additional issue I found. If my character sprite walks into the same tile as the NPC sprite, they both begin moving together and it becomes impossible to seperate them. My movement commands should only control my sprite, they should not also affect other character's sprites that are in the same tile. 

## Stage four: Wild encounters

I walked around the map until I encountered a wild monster. I like that the battle screen is centered in the browser as a whole, but it made me wish the game screen displaying the map and sprites was also centered (is this a map size issue due to the map being so small?). It seems disjointed (not cohesive) that they have seperate placements on the page. Since the monster I encountered was a lv6 Tidalin and my monster was a lv5 Flameling, I chose to flee due to the level disparity and the type disadvantage. the screen showed that I "Got away safely!" but then that message remained on the screen with no hint about how to return to walking around on the map. I initially thought that I would be soft-locked and have to restart the game to continue testing. It was only because I decided to randomly start pressing buttons that I discovered that the escape key closed that overlay and allowed me to return to the game map. This is bad UI/UX.

It actuall took me almost a dozen encounters before I encountered a monster with a favorable matchup to my starting monster. Since I had only one monster and did not have the chance to aquire other options yet, this was a little frustrating. I finally was able to recruit a Lv7 Sproutlet. Once again, a "Victory" messagfe was shown, but no indication about how to close the battle screen and go back to walking around on the map. Luckily I already knew to press the escape key from my previous experience, but some kind of tool tips would be useful to have (not just here, but as a widely used element).

After getting into another battle, I looked for a way to switch monsters and use my newly recruited Sproutlet. However, the only visible buttons were for my Flameling's attacks (Ember and Fire Fang), a "Flee" button, a "Bait" dropdown, and a "Recruit" button. No method of switching monsteres seemed to exist in the UI so I was unable to use or test that feature.

## Stage five: First server error

I pressed the directional buttons moderately rapidly and the sprite on the screen stopped responding to any inputs. Opening up the browser's developer tools show me this output:
```
:4173/#:1 Unchecked runtime.lastError: Could not establish connection. Receiving end does not exist.
```
I decided to check the server and saw the following output repeatedly:
```
2026-07-25T06:25:19.163700Z  INFO crates/core/src/host/wasm_common/module_host_actor.rs:1716: reducer returned error: queue full
```
I believe that if too many commands/events are sent to the server in too short a time the queue fills up, errors out, and stops accepting and new inputs. It might even stop processing any inputs that were already in the queue. This is a bug and we should adopt design patterns that allow us to gracefully have both this situation, and situations like this. In this case, a full queue should not freeze the player's sprite or cause a crash. The reducer should be able to update the queue appropriately, recover from this error, or simply ignore new commands until there's space in the queue (you may need to use your best judgement on a case-by-case basis to determine what the most appropriate action is). And It's related function on the client side should be able to gracefully hadle these kinds of situations without freezing the controls. I think the communication methods and the netcode for both the client and the server need to be thoroughly reviewed and potentially overhauled/redesigned.

Further investigation shows that the "queue full error" occurs in the server even when movement is working and is potentially unrelated to the previously described bug. That message may be related to the "slippery" movement issues described in the "Stage three" section. The movement freezing issue seems to occure after I press "Q", the arrow keys stop working as directional commands and start manipulating the page's scroll bars, scrolling the page left and right and up and down. A similar issue occurs while pressing some of the other keys (like "U").

## Stage six: fusion

After recruiting multiple monsters I again had to press keys randomly (this is a recurring problem) until I discovered that the "E" key opened up a fusion menu. There is currently only a single fusion recipe, which may be fine for right now but that list will need to be expanded once the project is feature complete and we begin adding playable content in the future. I like that there is a list of potential fusion recipes. I do wonder why the instructions for the menu specify both fusion and evolution. We should decide on one cohesive system rather than implementing multiple different ones. I'm leaning towards a system where the monsters collect different types of energy as they battle (depending on the opponent they defeat) and as you raise them (you can also feed them different types of energy). Then the monsters evolve when their total consumed energy reaches a certain threshold and the type of monster the evolve into depends on what kind of monser they are and what ratios of energy types they collected. For example, instead of the `Flameling + Tidalin -> Steamveil` fusion recipe, it would be a `Flameling + Water Energy -> Steamveil` if you started with a Flameling and a `Tidalin + Fire Energy -> Steamveil` if you started with a Tidalin, with both Flameling and Tidalin potentially also having other evolution recipes for different energy type combinations. One reason I'm leaning towards this system instead of fusion is that I want the player to be able to build a relationship with individual monsters, and fusion seems like it erases the individual monsters in order to create something new while evolution (via a catalyst) allows the individual monsters to grow and develop.

## Stage seven: Inventory

After discovering that the "I" key opens the inventory I proceeded to test those features. I can see my list of monsters and sone stats about them, but the "Care" button has no visual effect when pressed so I am unsure if it does anything. Additionally since my inventory is empty I cannot test using any items. This also means that I don't know of any way to heal my recruited monsters once they're hurt.

## Stage eight: trading

After discovering that the "O" key opens a menu for offering trades to other players I opened up a second browser to test that feature. It worked, but the design and UI/UX is terrible (a common theme for this playtest). A new menu that is very hard to read show up at the bottom of the page instead of using a similar overlay like the other menus. Every feature having it's own menu that is unrelated to the other menus seems like an odd design. As a user I would expent there to be one "main" menu that housed a list where you could select one of existing menus as a submenu. Only after the main menu is in place would I set up hotkeys to take me straight to the submenus. I would also try to use a similar design language for all the menus so the the overall design appears more cohesive.

## Stage nine: shopping

I finally discovered that the "G" key opens a shopping menu at the bottom of the page for buying items. This has all the same problems as the trading menu. It is hard to read, its placement is awkward, and doesn't use an overlay structure like the fusion menu does which makes it seem disjointed. Additionally, a shop's menu should probably be accessed by talking to an NPC (or interating with some other sprite representing the shop like a computer terminal, vending machine, teller window, etc...). The shop's items could also use descriptions or maybe tooltips that tell the user what they do. Also, a cost is listed, but the amount of money that I have is not obvious.

## Stage ten: Party menu

After continuing to try pressing more keys I found that "B" opened the menu that allows me to view my party, heal them, rename them, and send monsters to a "box". The overall design could still be improved, but this menu is better than the shopping and trading menus. I would still expect a "main" menu to exist that would allow you to navigate to this as a submenu.

## Stage eleven: Untested Features

The starting map has no enterances/exits/doors/pathways/gates to other maps, so I cannot test travelling from one location to another (if any other maps even exist). I also did not test PVP. I assume that works in a similar way to the wild encounter battles and I am comfortable testing that at a later date.

## Stage twelve: Conclusion

The overall UI/UX is the major issue that I ran into repeatedly. It needs to be redesigned and made cohesive with a standard design language common to the 2d topdown games that this project gets inspiration from. Additionally, a more responsive design, higher contrast text for easier readability, being aware of the viewport size in order to plan how the relative size and placement of various elements without having them appear off-screan (which requires the user to scroll to see them), having tool tips in various places and an instruction box that lists keybinds/controls, implementing nested menus, and other UI/UX improvements are all needed.

Then there's the netcode/movement related issues. Overall walking speed should be slowed down a bit and the "slippery" movement (where the sprite seems to slide past the intended stopping point instead of having more responsive controls) needs to be investigated, diagnosed, and resolved. I am still unsure what the root cause is. I wonder if there are any design patterns intended for this kind of scenario that would help avoid issues like this?

Finally, my changes to the fusion system described in `Stage six`.