import type {BoardGame} from './BoardGame';

// Placement is stored on the copy; this projection keeps shelf rendering focused.
export type GamePlacement = {
    game_id: string;
    container_box_id: number | null;
    sort_order: number;
    created_at: string;
    updated_at: string;
};

export function placementForGame(game: BoardGame): GamePlacement {
    return {
        game_id: game.id, container_box_id: game.container_box_id, sort_order: game.sort_order,
        created_at: game.created_at, updated_at: game.updated_at
    };
}

export type BoxFace = NonNullable<BoardGame['box_face']>;
const boxFaces: BoxFace[] = ['wxd', 'hxd', 'wxh'];

export function boxFace(game: BoardGame, direction: 'horizontal' | 'vertical'): BoxFace {
    return game.box_face ?? (direction === 'horizontal' ? 'wxd' : 'hxd');
}

export function nextBoxFace(game: BoardGame, direction: 'horizontal' | 'vertical'): BoxFace {
    return boxFaces[(boxFaces.indexOf(boxFace(game, direction)) + 1) % boxFaces.length];
}

// The cube layout sets the long axis; the face chooses which two dimensions are visible.
export function spineDimensions(game: BoardGame, direction: 'horizontal' | 'vertical'): {
    width: number;
    height: number
} {
    const face = boxFace(game, direction);
    const along = face === 'hxd' ? game.box_height_mm : game.box_width_mm;
    const across = face === 'wxh' ? game.box_height_mm : game.box_depth_mm;
    return direction === 'horizontal' ? {width: along, height: across} : {width: across, height: along};
}
