import express from 'express';
/**
 * Select integer or a default value.
 * @param source The source value.
 * @param defaultValue The default value, if the source is undefined or null.
 * @returns The safe integer of the source, or the default value.
 * @throws {TypeError} The source was not a safe integer or a string representation of a safe integer.
 */
function intOrElse(source, defaultValue) {
    if (source == null) {
        return defaultValue;
    }
    else if (typeof source === "string") {
        return Number.parseInt(source);
    }
    else if (Number.isSafeInteger(source)) {
        return source;
    }
    else {
        throw new TypeError("Invalid source value");
    }
}
const app = express();
const port = intOrElse(process.env.port, 3000);
app.use(express.json());
// Adding methods from controller. 
// Starting the app.
const server = app.listen(port, () => {
    console.log(`Dune server running at port ${port}`);
});
