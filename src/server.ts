import express from 'express';
import { Skills } from './data.ts';
import { registerResource } from './resource.ts';
import { Skill } from './sklll.ts';

/**
 * Select integer or a default value.
 * @param source The source value.
 * @param defaultValue The default value, if the source is undefined or null. 
 * @returns The safe integer of the source, or the default value. 
 * @throws {TypeError} The source was not a safe integer or a string representation of a safe integer. 
 */
function intOrElse(source: number|string|undefined|null, defaultValue: number): number {
    if (source == null) {
        return defaultValue;
    } else if (typeof source === "string") {
        return Number.parseInt(source);
    } else if (Number.isSafeInteger(source)) {
        return source;
    } else {
        throw new TypeError("Invalid source value");
    }
}

const app = express();
const port = intOrElse(process.env.port, 3000)
app.use(express.json());

// Adding methods from controller. 
registerResource(app, "/skills", Skills, (values) => {
    if (Array.isArray(values)) {
        throw new SyntaxError("Cannot handle more than skill.");
    } else {
        return Skill(values["name"], values["description"]);
    }
});

// Starting the app.
const server = app.listen(port, () => {
    console.log(`Dune server running at port ${port}`);
});

