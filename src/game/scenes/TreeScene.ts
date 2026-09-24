import Phaser from 'phaser';
import { fighters, getEnemyOrder } from '../config/fighters';

/**
 * TreeScene visualises the run progression as a palm tree built from the
 * pieces in /public/palm. Each tree segment carries the next enemy the player
 * will face. Enemies are arranged in a checkerboard pattern (1st on the left of
 * its segment, 2nd on the right, 3rd on the left, ...).
 *
 * Behaviour:
 *  1. On a fresh run (currentStreak === 0) the whole tree is shown, then the
 *     camera zooms onto the lowest segment (the next opponent).
 *  2. After every victory the lowest segment drops away, the tree shifts down
 *     and the camera zooms onto the new lowest segment.
 *  3. When the player has defeated every opponent the tree is rebuilt from
 *     scratch.
 *
 * After the intro/advance animation finishes the scene hands over to FightScene.
 *
 * EDITOR MODE:
 *  Press "E" at any time to enter a layout editor. In the editor you can drag
 *  every trunk segment and every monkey with the mouse, the live world
 *  coordinates are shown next to each object, the mouse wheel zooms and the
 *  arrow keys pan the camera. Press "S" (or the on-screen SAVE button) to dump
 *  the current layout as JSON into the browser console so the arrangement can
 *  be copied back into the code.
 */
export class TreeScene extends Phaser.Scene {
    private playerFighterId!: string;
    private arenaId!: string;
    private difficulty!: string;
    private currentStreak = 0;

    private enemyOrder: string[] = [];
    private total = 0;

    // Layout constants
    private readonly CX = 640;
    private readonly SEG_GAP = 44;
    private readonly BOTTOM_Y = 1100;
    private readonly FOCUS_ZOOM = 1.7;
    private readonly TRUNK_W = 150;
    private readonly TRUNK_H = 82;
    private readonly CROWN_W = 300;
    private readonly CROWN_H = 210;
    private readonly ENEMY_SIZE = 95;
    private readonly ENEMY_DX = 95;

    // ---------------------------------------------------------------------
    // FIXED LAYOUT TABLES
    //
    // These were hand-tuned in the in-scene editor (press "E") for the
    // Capuchin run and then frozen here so EVERY character shares the exact
    // same tree geometry. Only the monkey *sprites* differ per character –
    // their order comes from getEnemyOrder(), while the per-slot positions /
    // sizes / facing are taken from the tables below.
    //
    // The original Capuchin dump contained 12 pieces, but the trunk segment
    // and the "capuchin" monkey that were dragged off-canvas (because Capuchin
    // is the player and never appears as an enemy) have been removed. What is
    // left is a clean stack of 10 trunk slots + 1 crown = 11 slots, which is
    // exactly how many opponents any character faces.
    //
    // Slot indices run bottom -> top (0 = lowest trunk, last = crown/boss).
    // ---------------------------------------------------------------------
    private readonly TRUNK_SLOTS: { x: number; y: number; w: number; h: number }[] = [
        { x: 640, y: 1124, w: 150, h: 155 },
        { x: 642, y: 1038, w: 150, h: 82 },
        { x: 646, y: 987, w: 159, h: 92 },
        { x: 646, y: 936, w: 164, h: 91 },
        { x: 640, y: 893, w: 157, h: 82 },
        { x: 645, y: 844, w: 157, h: 89 },
        { x: 643, y: 797, w: 179, h: 119 },
        { x: 653, y: 746, w: 184, h: 98 },
        { x: 647, y: 693, w: 193, h: 99 },
        { x: 643, y: 663, w: 191, h: 73 }
    ];
    private readonly CROWN_SLOT: { x: number; y: number; w: number; h: number } =
        { x: 651, y: 558, w: 205, h: 193 };

    // Enemy geometry per slot. dx is the horizontal offset from CX, y is the
    // absolute world Y, w/h the display size. A negative dx means the monkey
    // sits on the left of the trunk (and therefore looks right). The last
    // entry is the boss sitting on the crown.
    private readonly ENEMY_SLOTS: { dx: number; y: number; w: number; h: number }[] = [
        { dx: -68, y: 1130, w: 95, h: 95 },
        { dx: -44, y: 1032, w: 76, h: 73 },
        { dx: 49, y: 989, w: 95, h: 95 },
        { dx: -47, y: 935, w: 76, h: 76 },
        { dx: 38, y: 896, w: 80, h: 76 },
        { dx: -55, y: 847, w: 91, h: 69 },
        { dx: 56, y: 796, w: 95, h: 95 },
        { dx: -48, y: 750, w: 71, h: 67 },
        { dx: 68, y: 697, w: 95, h: 95 },
        { dx: -50, y: 654, w: 95, h: 95 },
        { dx: 81, y: 582, w: 136, h: 119 }
    ];

    private pieces: Phaser.GameObjects.Image[] = [];

    // --- Editor state ---
    private editorMode = false;
    private enemies: { img: Phaser.GameObjects.Image; index: number; fighterId: string }[] = [];
    private editorLabels: Phaser.GameObjects.Text[] = [];
    private editorUI: Phaser.GameObjects.GameObject[] = [];
    private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
    private selected?: Phaser.GameObjects.Image;
    private resizeHandle?: Phaser.GameObjects.Rectangle;

    constructor() {
        super('TreeScene');
    }

    init(data: { playerFighterId: string; arenaId: string; difficulty: string; currentStreak?: number }) {
        this.playerFighterId = data.playerFighterId;
        this.arenaId = data.arenaId;
        this.difficulty = data.difficulty;
        this.currentStreak = data.currentStreak || 0;
    }

    create() {
        this.pieces = [];
        this.enemies = [];
        this.editorLabels = [];
        this.editorUI = [];
        this.editorMode = false;
        this.selected = undefined;
        this.resizeHandle = undefined;
        this.input.keyboard?.removeAllListeners();

        this.enemyOrder = getEnemyOrder(this.playerFighterId);
        this.total = this.enemyOrder.length;

        const effective = this.total > 0 ? ((this.currentStreak % this.total) + this.total) % this.total : 0;
        const isRebuild = this.currentStreak > 0 && effective === 0;

        // Dimmed background (beach_tree) fixed to the viewport so it always covers
        // the screen while the camera pans across the tall tree. It is oversized
        // because camera zoom also scales scrollFactor(0) objects, and at the
        // full-tree (zoomed-out) view a screen-sized image would leave gaps.
        const bg = this.add.image(this.scale.width / 2, this.scale.height / 2, 'beach_tree');
        bg.setDisplaySize(this.scale.width * 3, this.scale.height * 3);
        bg.setScrollFactor(0);
        bg.setTint(0x6a6a6a); // dim the background so the tree stands out
        bg.setDepth(-10);

        // Determine which segments are already consumed.
        // For a normal advance, segment (effective - 1) is the one that just got
        // cleared and will be animated dropping away.
        const dropIndex = (!isRebuild && this.currentStreak > 0) ? effective - 1 : -1;

        this.buildTree(effective, dropIndex);

        if (this.currentStreak === 0 || isRebuild) {
            this.playBuildSequence(effective);
        } else {
            this.playAdvanceSequence(effective, dropIndex);
        }

        // Press "E" at any moment to switch into the layout editor.
        this.input.keyboard?.on('keydown-E', () => {
            if (!this.editorMode) this.enterEditorMode();
        });
    }

    /**
     * Returns the trunk/crown geometry for slot `i` of a run with `total`
     * slots. The crown is always the topmost slot (i === total - 1). For any
     * slot the tables above are used directly; if a run happens to have more
     * slots than the tables describe (e.g. a player whose roster yields an
     * extra opponent) the missing trunk slots are extrapolated with SEG_GAP so
     * the tree still stacks neatly.
     */
    private pieceLayout(i: number): { x: number; y: number; w: number; h: number } {
        const isCrown = i === this.total - 1;
        if (isCrown) {
            // Keep the crown's original offset above the last described trunk.
            const lastTrunkIdx = this.total - 2;
            const baseTrunk = this.trunkLayout(lastTrunkIdx);
            const refTrunk = this.TRUNK_SLOTS[this.TRUNK_SLOTS.length - 1];
            const dy = this.CROWN_SLOT.y - refTrunk.y; // negative (crown above trunk)
            return { x: this.CROWN_SLOT.x, y: baseTrunk.y + dy, w: this.CROWN_SLOT.w, h: this.CROWN_SLOT.h };
        }
        return this.trunkLayout(i);
    }

    private trunkLayout(i: number): { x: number; y: number; w: number; h: number } {
        if (i < this.TRUNK_SLOTS.length) return this.TRUNK_SLOTS[i];
        // Extrapolate above the last described trunk slot.
        const last = this.TRUNK_SLOTS[this.TRUNK_SLOTS.length - 1];
        const extra = i - (this.TRUNK_SLOTS.length - 1);
        return { x: this.CX, y: last.y - extra * this.SEG_GAP, w: this.TRUNK_W, h: this.TRUNK_H };
    }

    /** Enemy geometry (absolute x/y and display size) for slot `i`. */
    private enemyLayout(i: number): { x: number; y: number; w: number; h: number } {
        if (i < this.ENEMY_SLOTS.length) {
            const s = this.ENEMY_SLOTS[i];
            return { x: this.CX + s.dx, y: s.y, w: s.w, h: s.h };
        }
        // Fallback: checkerboard placement next to the (extrapolated) trunk.
        const trunk = this.pieceLayout(i);
        const onLeft = i % 2 === 0;
        return {
            x: this.CX + (onLeft ? -this.ENEMY_DX : this.ENEMY_DX),
            y: trunk.y - 20,
            w: this.ENEMY_SIZE,
            h: this.ENEMY_SIZE
        };
    }

    private pieceWorldY(i: number): number {
        return this.pieceLayout(i).y;
    }

    private pieceKey(i: number): string {
        if (i === this.total - 1) return 'palm14';
        return `palm${(i % 13) + 1}`;
    }

    /**
     * Builds every tree segment plus the enemy sitting on it.
     * @param firstActive index of the lowest still-active segment
     * @param dropIndex   index of the segment that should remain visible to be animated dropping (or -1)
     */
    private buildTree(firstActive: number, dropIndex: number) {
        for (let i = 0; i < this.total; i++) {
            const isCrown = i === this.total - 1;
            const layout = this.pieceLayout(i);

            const piece = this.add.image(layout.x, layout.y, this.pieceKey(i));
            piece.setDisplaySize(layout.w, layout.h);
            piece.setDepth(i); // higher pieces render above lower ones
            piece.setData('kind', isCrown ? 'crown' : 'trunk');
            piece.setData('index', i);
            this.pieces[i] = piece;

            // Hide already-consumed segments (everything below the drop/active piece).
            const lowestVisible = dropIndex >= 0 ? dropIndex : firstActive;
            if (i < lowestVisible) {
                piece.setVisible(false);
            }

            // Place an enemy on every still-active segment (firstActive .. top).
            // The dropping segment's enemy is already defeated, so it gets none.
            if (i >= firstActive) {
                this.createEnemyOnPiece(i);
            }
        }
    }

    private createEnemyOnPiece(i: number) {
        const fighterId = this.enemyOrder[i];
        const config = fighters.find(f => f.id === fighterId);
        if (!config) return;

        // Per-slot geometry frozen from the hand-tuned Capuchin layout.
        const slot = this.enemyLayout(i);
        const onLeft = slot.x < this.CX;
        const ex = slot.x;
        const ey = slot.y;

        const enemy = this.add.image(ex, ey, config.assetKey);
        enemy.setDisplaySize(slot.w, slot.h);
        // Keep monkeys above every trunk/crown piece so they always stay in
        // the foreground (a higher trunk segment must never overlap a lower
        // monkey). Trunk/crown depths run 0..total-1, so a 500 base clears them
        // all while staying below the editor HUD (depth 900+).
        enemy.setDepth(500 + i);
        // Face the trunk (enemy on the left looks right, enemy on the right looks left).
        enemy.setFlipX(onLeft);
        enemy.setData('kind', 'enemy');
        enemy.setData('index', i);
        enemy.setData('fighterId', fighterId);

        this.enemies.push({ img: enemy, index: i, fighterId });

        // Gentle idle bob so the tree feels alive.
        this.tweens.add({
            targets: enemy,
            y: ey - 8,
            duration: 900 + (i % 3) * 120,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    /** Computes the zoom level that fits the whole tree on screen. */
    private getFullViewZoom(): number {
        const treeHeight = this.getTreeBottomY() - this.getTreeTopY();
        const zoom = (this.scale.height * 0.9) / treeHeight;
        return Phaser.Math.Clamp(zoom, 0.45, 1);
    }

    private getTreeMidY(): number {
        return (this.getTreeTopY() + this.getTreeBottomY()) / 2;
    }

    private getTreeTopY(): number {
        const crown = this.pieceLayout(this.total - 1);
        return crown.y - crown.h / 2;
    }

    private getTreeBottomY(): number {
        const base = this.pieceLayout(0);
        return base.y + base.h / 2;
    }

    /** Fresh build / rebuild: show whole tree, then zoom onto the lowest segment. */
    private playBuildSequence(focus: number) {
        const cam = this.cameras.main;
        cam.setZoom(this.getFullViewZoom());
        cam.centerOn(this.CX, this.getTreeMidY());
        cam.fadeIn(400, 0, 0, 0);

        const hold = 950;
        const zoomDur = 1300;

        this.time.delayedCall(hold, () => {
            cam.pan(this.CX, this.pieceWorldY(focus), zoomDur, 'Sine.easeInOut');
            cam.zoomTo(this.FOCUS_ZOOM, zoomDur, 'Sine.easeInOut');
        });

        this.time.delayedCall(hold + zoomDur + 250, () => this.startFight());
    }

    /** Normal advance: drop the cleared segment, shift the tree down, zoom onto the new lowest. */
    private playAdvanceSequence(focus: number, dropIndex: number) {
        const cam = this.cameras.main;
        cam.setZoom(this.FOCUS_ZOOM);
        cam.centerOn(this.CX, this.pieceWorldY(dropIndex >= 0 ? dropIndex : focus));
        cam.fadeIn(300, 0, 0, 0);

        const dropPiece = this.pieces[dropIndex];
        if (dropPiece) {
            this.tweens.add({
                targets: dropPiece,
                y: dropPiece.y + 500,
                alpha: 0,
                angle: 25,
                duration: 700,
                ease: 'Quad.easeIn'
            });
        }

        const panDelay = 450;
        const panDur = 1100;

        this.time.delayedCall(panDelay, () => {
            cam.pan(this.CX, this.pieceWorldY(focus), panDur, 'Sine.easeInOut');
            cam.zoomTo(this.FOCUS_ZOOM, panDur, 'Sine.easeInOut');
        });

        this.time.delayedCall(panDelay + panDur + 250, () => this.startFight());
    }

    // =====================================================================
    // EDITOR MODE
    // =====================================================================

    /**
     * Switches the scene into an interactive layout editor: stops the intro
     * animation and the auto-handoff to FightScene, fits the whole tree on
     * screen and makes every trunk segment / monkey draggable with a live
     * coordinate read-out.
     */
    private enterEditorMode() {
        this.editorMode = true;

        // Stop the scheduled hand-over to FightScene and any pending camera moves.
        this.time.removeAllEvents();
        this.tweens.killAll();

        const cam = this.cameras.main;
        cam.panEffect.reset();
        cam.zoomEffect.reset();
        cam.fadeEffect.reset();
        cam.setZoom(this.getFullViewZoom());
        cam.centerOn(this.CX, this.getTreeMidY());

        this.cursors = this.input.keyboard?.createCursorKeys();

        // Make every visible trunk segment and every monkey draggable.
        for (const piece of this.pieces) {
            if (piece.visible) this.makeDraggable(piece);
        }
        for (const e of this.enemies) {
            this.makeDraggable(e.img);
        }

        // Single global drag handler. When the small resize handle is dragged it
        // stretches the currently selected object; otherwise it moves the object
        // under the pointer (dragX/dragY are already in world space, so this
        // works at any zoom level).
        this.input.on('drag', (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject, dragX: number, dragY: number) => {
            if (obj === this.resizeHandle && this.selected) {
                // The handle sits at the bottom-right corner; the distance from the
                // object's centre to the pointer defines the new half-size.
                const newW = Math.max(12, Math.round((dragX - this.selected.x) * 2));
                const newH = Math.max(12, Math.round((dragY - this.selected.y) * 2));
                this.selected.setDisplaySize(newW, newH);
                this.positionResizeHandle();
                this.refreshEditorLabels();
                return;
            }
            const img = obj as Phaser.GameObjects.Image;
            img.x = Math.round(dragX);
            img.y = Math.round(dragY);
            if (img === this.selected) this.positionResizeHandle();
            this.refreshEditorLabels();
        });

        // Clicking an object selects it and reveals the resize handle.
        this.input.on('gameobjectdown', (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject) => {
            if (obj === this.resizeHandle) return;
            if (obj instanceof Phaser.GameObjects.Image) this.selectObject(obj);
        });

        // Mouse wheel zooms the camera.
        this.input.on('wheel', (_p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
            const z = Phaser.Math.Clamp(cam.zoom - dy * 0.001, 0.2, 3);
            cam.setZoom(z);
        });

        // Keyboard shortcut for saving.
        this.input.keyboard?.on('keydown-S', () => this.dumpLayout());

        this.buildEditorOverlay();
        this.refreshEditorLabels();
    }

    private makeDraggable(obj: Phaser.GameObjects.Image) {
        obj.setInteractive({ useHandCursor: true, draggable: true });
        this.input.setDraggable(obj);
    }

    /**
     * Marks the given object as the active selection and (re)creates the
     * bottom-right resize handle so its size can be stretched to fit the
     * background picture.
     */
    private selectObject(obj: Phaser.GameObjects.Image) {
        this.selected = obj;

        if (!this.resizeHandle) {
            const handle = this.add.rectangle(0, 0, 22, 22, 0xffd54a, 0.95);
            handle.setStrokeStyle(2, 0x000000);
            handle.setDepth(1001);
            handle.setInteractive({ useHandCursor: true, draggable: true });
            this.input.setDraggable(handle);
            this.resizeHandle = handle;
            this.editorUI.push(handle);
        }
        this.resizeHandle.setVisible(true);
        this.positionResizeHandle();
        this.refreshEditorLabels();
    }

    /** Keeps the resize handle pinned to the selected object's bottom-right corner. */
    private positionResizeHandle() {
        if (!this.resizeHandle || !this.selected) return;
        this.resizeHandle.x = this.selected.x + this.selected.displayWidth / 2;
        this.resizeHandle.y = this.selected.y + this.selected.displayHeight / 2;
        // Keep the handle a constant on-screen size regardless of camera zoom.
        const inv = 1 / this.cameras.main.zoom;
        this.resizeHandle.setScale(inv);
    }

    /** Builds the fixed-to-screen editor HUD (instructions + SAVE button). */
    private buildEditorOverlay() {
        const help = this.add.text(16, 16,
            'РЕЖИМ РЕДАКТОРА\n' +
            '• Тяни мышью пальму и обезьян\n' +
            '• Клик по элементу — выбрать, жёлтый угол — растянуть\n' +
            '• Колесо мыши — зум\n' +
            '• Стрелки — двигать камеру\n' +
            '• S или кнопка SAVE — вывести координаты и размеры в консоль',
            { fontSize: '18px', color: '#ffffff', backgroundColor: '#000000aa', padding: { x: 10, y: 8 } }
        );
        help.setScrollFactor(0);
        help.setDepth(1000);
        this.editorUI.push(help);

        const btn = this.add.text(this.scale.width - 16, 16, '💾 SAVE', {
            fontSize: '22px', color: '#000000', backgroundColor: '#ffd54a',
            padding: { x: 16, y: 10 }
        });
        btn.setOrigin(1, 0);
        btn.setScrollFactor(0);
        btn.setDepth(1000);
        btn.setInteractive({ useHandCursor: true });
        btn.on('pointerover', () => btn.setColor('#333333'));
        btn.on('pointerout', () => btn.setColor('#000000'));
        btn.on('pointerdown', () => this.dumpLayout());
        this.editorUI.push(btn);
    }

    /** Re-creates a floating coordinate label to the right of every draggable object. */
    private refreshEditorLabels() {
        for (const l of this.editorLabels) l.destroy();
        this.editorLabels = [];

        // Place the label just to the right of the object, vertically centred.
        const addLabel = (obj: Phaser.GameObjects.Image, text: string) => {
            const label = this.add.text(obj.x + obj.displayWidth / 2 + 8, obj.y, text, {
                fontSize: '14px', color: '#ffffff', backgroundColor: '#000000cc',
                padding: { x: 4, y: 2 }, align: 'left'
            });
            label.setOrigin(0, 0.5);
            label.setDepth(900);
            this.editorLabels.push(label);
        };

        for (const piece of this.pieces) {
            if (!piece.visible) continue;
            const idx = piece.getData('index');
            const kind = piece.getData('kind');
            addLabel(piece,
                `${kind} #${idx}\n(${Math.round(piece.x)}, ${Math.round(piece.y)})\n` +
                `${Math.round(piece.displayWidth)}×${Math.round(piece.displayHeight)}`);
        }
        for (const e of this.enemies) {
            const dx = Math.round(e.img.x - this.CX);
            addLabel(e.img,
                `${e.fighterId} #${e.index}\n(${Math.round(e.img.x)}, ${Math.round(e.img.y)})\n` +
                `dx=${dx}  ${Math.round(e.img.displayWidth)}×${Math.round(e.img.displayHeight)}`);
        }
    }

    /**
     * Collects the current positions of every trunk segment and monkey and
     * prints them to the console as copy-pasteable JSON.
     */
    private dumpLayout() {
        const layout = {
            constants: {
                CX: this.CX, SEG_GAP: this.SEG_GAP, BOTTOM_Y: this.BOTTOM_Y,
                TRUNK_W: this.TRUNK_W, TRUNK_H: this.TRUNK_H,
                CROWN_W: this.CROWN_W, CROWN_H: this.CROWN_H,
                ENEMY_SIZE: this.ENEMY_SIZE, ENEMY_DX: this.ENEMY_DX
            },
            pieces: this.pieces
                .filter(p => p.visible)
                .map(p => ({
                    index: p.getData('index'),
                    kind: p.getData('kind'),
                    x: Math.round(p.x),
                    y: Math.round(p.y),
                    width: Math.round(p.displayWidth),
                    height: Math.round(p.displayHeight)
                })),
            enemies: this.enemies.map(e => ({
                index: e.index,
                fighterId: e.fighterId,
                x: Math.round(e.img.x),
                y: Math.round(e.img.y),
                dx: Math.round(e.img.x - this.CX),
                width: Math.round(e.img.displayWidth),
                height: Math.round(e.img.displayHeight)
            }))
        };

        const json = JSON.stringify(layout, null, 2);
        // eslint-disable-next-line no-console
        console.log('=== TREE LAYOUT ===\n' + json);

        // On-screen confirmation toast.
        const toast = this.add.text(this.scale.width / 2, this.scale.height - 40,
            'Координаты выведены в консоль (F12)', {
            fontSize: '20px', color: '#000000', backgroundColor: '#9be15d',
            padding: { x: 14, y: 8 }
        });
        toast.setOrigin(0.5, 1);
        toast.setScrollFactor(0);
        toast.setDepth(1000);
        this.tweens.add({
            targets: toast,
            alpha: 0,
            delay: 1500,
            duration: 600,
            onComplete: () => toast.destroy()
        });
    }

    update() {
        if (!this.editorMode || !this.cursors) return;
        const cam = this.cameras.main;
        const speed = 12 / cam.zoom;
        if (this.cursors.left?.isDown) cam.scrollX -= speed;
        if (this.cursors.right?.isDown) cam.scrollX += speed;
        if (this.cursors.up?.isDown) cam.scrollY -= speed;
        if (this.cursors.down?.isDown) cam.scrollY += speed;
        if (this.selected) this.positionResizeHandle();
        if (this.editorLabels.length) this.refreshEditorLabels();
    }

    private startFight() {
        if (this.editorMode) return;
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('FightScene', {
                playerFighterId: this.playerFighterId,
                arenaId: this.arenaId,
                difficulty: this.difficulty,
                currentStreak: this.currentStreak
            });
        });
    }
}

