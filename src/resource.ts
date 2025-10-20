import type { Application, Request, Response } from "express";
import type { ResourceChange } from "./resourcepath.ts";
import { ResourcePath, parseJsonResourceChanges, parseXmlResourceChanges } from "./resourcepath.ts";

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
    update(key: KEY, value: TYPE): Promise<never>;

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
 * A resource witt adjustable properties.  
 */
export interface RecordResource<TYPE, KEY = string> extends Resource<TYPE, KEY> {

    /**
     * The keys of the record. 
     */
    properties(): Iterator<string>;

    /**
     * Is a property value valid for a record with key.
     * @param key The altered record key. 
     * @param property The tested property.
     * @param value The tested value.
     * @return The property value is valid for the record with key.
     */
    validValue(source: TYPE, property: string, value: any): boolean;


    /**
     * Create a new value by applying a change. 
     * @param source The value before update. 
     * @param property The altered property.
     * @param value The new value of the property.
     * @return The property value is valid for the record with key.
     */
    changeValue(source: TYPE, property: string, value: any): TYPE;


    /**
    * Update fields of an existing value.
    * 
    * The keys not belonging to keys are ignored.
    * 
    * @param key  The key of the altered value.
    * @param values The altered values of the record.
    * @returns The promise of changing keys ot the values. 
    * @throws {SyntaxError} Any of the existing valeus was rejected.
    */
    adjust(key: KEY, values: ResourceChange<TYPE>[]): Promise<never>;
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

function createUnsupportedBodyError(req: Request): Error {
    return new TypeError(`Unsupported content type ${req.headers["content-type"]}`);
}

function createUnsupportedResourceError<TYPE, KEY = string>(resource: Resource<TYPE, KEY>, operation: string): Error {
    return new Error(`Unsupported ${operation} for ${resource.name}`);
}

function sendInvalidResourceRequestMessage(req: Request, res: Response, resourceName: string, key: string) {
    res.status(400).json({
        message: `An invalid request.`,
        resource: resourceName
    });

}


function sendUnsupportedResourceMessage(req: Request, res: Response, resourceName: string, operation: string) {
    res.status(405).json({
        message: `The ${resourceName} does not support ${operation}`,
        resource: resourceName
    });
}

function sendResourceNotFoundMessage(req: Request, res: Response, resourceName: string, key: string) {
    res.status(404).json({
        message: `The ${resourceName}/${key} does not exist.`,
        resource: resourceName
    });

}

function isRecord<TYPE, KEY>(source: Resource<TYPE, KEY> | RecordResource<TYPE, KEY>): Resource<TYPE, KEY> | undefined {
    return source;
}

function isRecordResource<TYPE, KEY>(source: Resource<TYPE, KEY> | RecordResource<TYPE, KEY>): RecordResource<TYPE, KEY> | undefined {
    if ("adjust" in source) {
        return source;
    } else {
        return undefined;
    }
}

/**
 * Parse body of the value. 
 * @param request The request, whose body is parsed.
 * @param parser The parser function.
 * @returns The promsie of the result, or rejection indicating the error.
 */
export function parseBody<TYPE>(request: Request, parser: Parser<TYPE> | AsyncParser<TYPE>): Promise<TYPE> {
    return new Promise<TYPE>((resolve, reject) => {
        try {
            resolve(parser(request.body));
        } catch (err) {
            reject(err);
        }
    });
}

/**
 * 
 * @param request 
 * @param resource 
 * @returns The promise of the resource change list. 
 */
export function parseResourceChanges<TYPE>(request: Request, resource: Resource<TYPE> | RecordResource<TYPE>): Promise<ResourceChange<TYPE>[]> {
    return new Promise((resolve, reject) => {
        const target = isRecordResource(resource);
        if (target) {
            const id = request.params.id;
            switch (request.headers["content-type"]) {
                case "application/xml":
                    resolve(parseXmlResourceChanges<TYPE>(request).then(
                        changes => {
                            return target.adjust(id, changes);
                        }
                    ));
                    break;
                case "application/json":
                    resolve(parseJsonResourceChanges<TYPE>(request).then(
                        changes => {
                            return target.adjust(id, changes);
                        }
                    ));
                    break;
                default:
                    reject(createUnsupportedBodyError(request));
            }
        } else {
            reject(createUnsupportedResourceError(resource, "patch"));
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
export function registerResource<TYPE>(app: Application, path: string, resource?: Resource<TYPE> | RecordResource<TYPE>,
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
                    return resource.create(result).then(id => {
                        console.log(`Created a new ${resource.name}: id=${id}, value: ${body}`)
                        res.status(201).json(id);
                    })
                }
            ).catch(err => {
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
                    return resource.update(id, result).then(() => {
                        console.log(`Updated ${resource.name}: id=${id}, value: ${body}`)
                        res.status(204).end();
                    })
                }
            ).catch(err => {
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
    app.patch(path + ":id", function (req: Request, res: Response) {
        const target = isRecordResource(resource);
        if (target) {
            // Adjustable property.
            parseResourceChanges(req, resource).then(
                changes => {
                    const id = req.params.id;
                    target.adjust(id, changes).then(
                        result => {
                            res.status(204).end();
                        },
                        err => {
                            sendResourceNotFoundMessage(req, res, resource.name, id);
                        }
                    );
                }
            ).catch( err => {
                sendInvalidResourceRequestMessage(req, res, resource.name, req.method);
            })
            

        } else {
            sendUnsupportedResourceMessage(req, res, resource.name, req.method);
        }
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