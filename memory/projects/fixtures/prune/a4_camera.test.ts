// cut from client/src/render/camera.test.ts
describe('FollowCamera C1a: follow formula (playerPx - viewW/2)', () => {
  it('BITES: player at (5,3) in 10×7 map, 160×112 viewport → tile-center formula result (M12.5d-4)', () => {
    // Map: 10×7, viewport: 160×112, player at (5,3) (center of map).
    // Tile-CENTER formula: rawX = (5+0.5)*32 - 80 = 176-80 = 96; clamped=96
    //                                  rawY = (3+0.5)*32 - 56 = 112-56 = 56; clamped=56
    // OLD tile-CORNER formula:          rawX = 5*32 - 80 = 80; rawY = 3*32 - 56 = 40
    // Kills: an impl still using tile-corner formula (returns {x:80, y:40} instead of {x:96, y:56}).
    const cam = new FollowCamera();
    const off = cam.offsetFor(5, 3, 160, 112, 10, 7);
    expect(off.x).toBe(96);
    expect(off.y).toBe(56);
  });
});

describe('FollowCamera M12.5d-4: centers on tile CENTER (+0.5 tile offset)', () => {
  it('BITES (M12.5d-4): player at integer tile uses tile CENTER, not tile corner', () => {
    // With tile-corner: rawX = 5 * 32 - 80 = 80. With tile-center: rawX = 5.5 * 32 - 80 = 96.
    // Wrong impl killed: playerTileX * TILE_PX (corner) returns {x:80, y:40} not {x:96, y:56}.
    const cam = new FollowCamera();
    const off = cam.offsetFor(5, 3, 160, 112, 10, 7);
    // tile center: rawX = (5 + 0.5) * 32 - 80 = 176 - 80 = 96; clamped: min(96, 160) = 96
    // tile center: rawY = (3 + 0.5) * 32 - 56 = 112 - 56 = 56; clamped: min(56, 112) = 56
    expect(off.x).toBe(96);
    expect(off.y).toBe(56);
  });
});
