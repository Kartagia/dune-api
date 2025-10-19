

/**
 * @module data The dummy data of the skill testing. 
 */

import type { Resource } from "./resource.ts";
import { Skill } from "./sklll.js";
import { randomUUID } from "crypto";

var data = {
    skills: new Map<string, Skill>([
        ["1", Skill("Battle", "An ability to fight or command.")], 
        ["2", Skill("Communication", "Communicate with other people")]
    ])
}

export const Skills: Resource<Skill> = {
    name: "skill",
    getAll: function (): Promise<readonly [string, Skill][]> {
        return Promise.resolve([...data.skills.entries()]);
    },
    get: function (key: string): Promise<Skill> {
        return new Promise( (resolve, reject) => {
            if (data.skills.has(key)) {
                resolve(data.skills.get(key));
            } else {
                reject(new RangeError());
            }
        });
    },
    update: function (key: string, value: Skill): Promise<never> {
        return new Promise( (resolve, reject) => {
            if (data.skills.has(key)) {
                data.skills.set(key, value);
                resolve(undefined);
            } else {
                reject(new RangeError());
            }
        });
    },
    delete: function (key: string): Promise<boolean> {
        return new Promise( (resolve, reject) => {
            if (data.skills.has(key)) {
                resolve(data.skills.delete(key));
            } else {
                reject(new RangeError());
            }
        });
    },
    create: function (value: Skill): Promise<string> {
                return new Promise( (resolve, reject) => {
            const id = randomUUID();
            data.skills.set(id, value);
            resolve(id);
        });
    }
};