import type { Application, Request, Response } from "express";

/**
 * An interface representing a resource.
 * 
 * @template TYPE The type of the resource values.
 * @template [KEY=string] The type of the resource keys.
 */
export interface Resource<
    TYPE,
    KEY = string> {

    /**
     * The name of the resource.
     */
    readonly name: string;

    /**
     * Get all entries.
     * @returns A read-only array of the key-value pairs of the resources. 
     */
    getAll(): Promise<Readonly<[KEY, TYPE][]>>;

    /**
     * Get value of a key.
     * @param key The key of the resource.
     * @returns The promise of the value associated iwth the key.
     * @throws {RangeError} The rejected error indicating the value was not found.
     */
    get(key: KEY): Promise<TYPE>;

    /**
     * Update an existing value.
     * @param key The key of the updated value.
     * @param value THe new value.
     * @returns The promise of the completion of the event.
     * @throws {RangeError} The rejected error indicating the value was not found.
     * @throws {SyntaxError} The rejected value, if the value is not accepted.
     */
    update(key: KEY, value: TYPE): Promise<void>;

    /**
     * Remove a resource with key.
     * @param key The removed key.
     * @returns The promise of success status. 
     * @throws {RangeError} The resource with key was not found.
     */
    delete(key: KEY): Promise<boolean>;

    /**
     * Create a new value in the resource.
     * @param value The created value.
     * @returns The promise of the key assigned to the value.
     * @throws {SyntaxError} The rejected value, if the value is not accepted.
     */
    create(value: TYPE): Promise<KEY>;
}

/**
 * Synchronouse parse of a value.
 * 
 * @template TYPE The type of the resulting value.
 * @template SOURCE THe source value type. 
 * @callback Parser
 * @param source The parsed value. 
 * @returns The parse result.
 * @throws {SyntaxError} The source is not a valid source.
 */
export type Parser<TYPE, SOURCE = any> = (source: SOURCE) => TYPE;


/**
 * Asynchronouse parse of a value.
 * 
 * @template TYPE The type of the resulting value.
 * @template SOURCE THe source value type. 
 * @callback Parser
 * @param source The parsed value. 
 * @returns The promise of the parsed value.
 * @throws {SyntaxError} The rejected value, if the parse failed. 
 */
export type AsyncParser<TYPE, SOURCE = any> = (source: SOURCE) => Promise<TYPE>;

/**
 * Parse body of the value. 
 * @param request The request, whose body is parsed.
 * @param parser The parser function.
 * @returns The promsie of the result, or rejection indicating the error.
 */
export function parseBody<TYPE>(request: Request, parser: Parser<TYPE>|AsyncParser<TYPE>): Promise<TYPE> {
    return new Promise<TYPE>( (resolve, reject) => {
        try {
            resolve(parser(request.body));
        } catch(err) {
            reject(err);
        }
    });
}

/**
 * Register a skill user to the app.  
 * @param app The express app into which the resource is registered.
 * @param path The base path of the resource. 
 * @param resource The resource declaratoin.
 * @param parser The optional parser used to parse JSON body. If undefined, the create and update are not allowed.
 */
export function registerResource<TYPE>(app: Application, path: string, resource?: Resource<TYPE>,
    parser: (value: Record<string, any>) => TYPE = undefined) {
    app.get(path, function (req: Request, res: Response) {
        try {
            resource.getAll().then(result => res.json(result),
                error => {
                    // TODO: add logger of an error
                    console.error(error);
                    res.status(500).json({ message: "The resource is not available.", resource: resource.name });
                });
        } catch (err) {
            // TODO: add logger of an error
            console.error(err);
            res.status(500).json({ message: "The resource is not available.", resuorce: resource.name });
        }
    });
    app.get(path + "/:id", function (req: Request, res: Response) {
        const id = req.params.id;
        try {
            resource.get(id).then(result => {
                res.json(result);
            },
                error => {
                    console.error(error);
                    res.status(404).json({ message: "Not found", resource: resource.name });
                }
            );
        } catch (err) {
            // TODO: add logger of an error
            console.error(err);
            res.status(500).json({ message: "The resource is not available.", resource: resource.name });
        }
    });

    /**
     * Create resource value. 
     */
    app.post(path, function (req: Request, res: Response) {
        if (parser) {
            const body = req.body;
            parseBody(req, parser).then(
                async result => {
                    return resource.create(result).then( id => {
                        console.log(`Created a new ${resource.name}: id=${id}, value: ${body}`)
                        res.status(201).json(id);
                    })
                }
            ).catch( err => {
                console.error(err);
                res.status(400).json({ message: `Invalid ${resource.name}.`, resource: resource.name, value: body });
            });
        } else {
            res.status(405).json({ message: `Unsupported ${resource.name} operation.`, resource: resource.name });
        }
    })
    /**
     * Update resource value. 
     */
    app.post(path + "/:id", function (req: Request, res: Response) {
        if (parser) {
            const id = req.params.id;
            const body = req.body;
            parseBody(req, parser).then(
                async result => {
                    return resource.update(id, result).then( () => {
                        console.log(`Updated ${resource.name}: id=${id}, value: ${body}`)
                        res.status(204).end();
                    })
                }
            ).catch( err => {
                console.error(err);
                res.status(400).json({ message: `Invalid ${resource.name}.`, resource: resource.name, value: body });
            });
        } else {
            res.status(405).json({ message: `Unsupported ${resource.name} operation.`, resource: resource.name });
        }
    })

    /**
     * Modify some fields of the resource. 
     */
    app.put(path + ":id", function (req: Request, res: Response) {
        
    })

    /**
     * Delete resource value.
     */
    app.delete(path + "/:id", function (req: Request, res: Response) {
        const id = req.params.id;
        try {
            resource.delete(id).then(
                result => {
                    res.json(result);
                },
                error => {
                    console.error(error);
                    res.status(404).json({ message: "Not found", resource: resource.name });
                }
            );
        } catch (err) {
            // TODO: add logger of an error
            console.error(err);
            res.status(500).json({ message: "The resource is not available.", resuorce: resource.name });
        }
    });
}