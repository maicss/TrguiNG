/**
 * transgui-ng - next gen remote GUI for transmission torrent daemon
 * Copyright (C) 2022  qu1ck (mail at qu1ck.org)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import type { TorrentActionMethodsType, TransmissionClient } from "./rpc/client";
import type { Torrent } from "rpc/torrent";

const ActionMethods = [
    "resume",
    "pause",
    "moveQueueUp",
    "moveQueueDown",
    "changeDirectory",
    "verify",
    "reannounce",
] as const;

export type ActionMethodsType = typeof ActionMethods[number];

interface Action {
    name: ActionMethodsType,
    method: (ac: ActionController, ...args: any[]) => Promise<void>,
    defaultShortcut: string,
}

function mapSimpleAction(name: ActionMethodsType, method: TorrentActionMethodsType, shortcut: string): Action {
    return {
        name,
        method: async (ac: ActionController) => {
            const torrentIds = Array.from(ac.selectedTorrents);
            await ac.client.torrentAction(method, torrentIds);
        },
        defaultShortcut: shortcut
    };
}

const Actions: Action[] = [
    mapSimpleAction("resume", "torrent-start", ""),
    mapSimpleAction("pause", "torrent-stop", ""),
    mapSimpleAction("moveQueueUp", "queue-move-up", ""),
    mapSimpleAction("moveQueueDown", "queue-move-down", ""),
    {
        name: "changeDirectory",
        method: async (ac: ActionController, location: string, move: boolean) => {
            const torrentIds = Array.from(ac.selectedTorrents);
            await ac.client.torrentMove(torrentIds, location, move);
        },
        defaultShortcut: "",
    },
    mapSimpleAction("verify", "torrent-verify", ""),
    mapSimpleAction("reannounce", "torrent-reannounce", ""),
];

interface ModalCallbacks {
    setLabels: () => void,
    remove: () => void,
    move: () => void,
    addMagnet: () => void,
    addTorrent: () => void,
    daemonSettings: () => void,
}

export type ActionModalCallback = keyof ModalCallbacks;

export class ActionController {
    client: TransmissionClient;
    methodMap: Record<string, (ac: ActionController, ...args: any[]) => Promise<void>>;
    modalCallbacks: ModalCallbacks | undefined;
    selectedTorrents: Set<number>;
    torrents: Torrent[];

    constructor(client: TransmissionClient) {
        this.client = client;
        this.methodMap = {};
        for (const action of Actions) {
            this.methodMap[action.name] = action.method;
            // TODO shortcuts
        }
        this.selectedTorrents = new Set();
        this.torrents = [];
    }

    async run(method: ActionMethodsType, ...args: any[]) {
        console.log("Running method", method);
        console.log("Args:", args);
        if (method in this.methodMap) {
            await this.methodMap[method](this, ...args);
        }
    }

    setSelected(selected: Set<number>) {
        this.selectedTorrents = selected;
    }

    setTorrents(torrents: Torrent[]) {
        this.torrents = torrents;
    }

    setModalCallbacks(callbacks: ModalCallbacks) {
        this.modalCallbacks = callbacks;
    }

    showModal(modal: ActionModalCallback) {
        this.modalCallbacks?.[modal]();
    }
}
