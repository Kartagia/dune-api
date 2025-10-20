
import type { Request, Response } from "express";

/**
 * A rest resource path. 
 * 
 * @module rest/resourcepath
 */


/**
 * The resource type.
 * - add => Add a new property or resource.
 * - remove => Remove a new property or resource.
 * - update => Change an existing property.
 * - move => Move a property or resource.
 */
export type ResourceChangeType = ("add" | "remove" | "update" | "move");

/**
 * A resource path.
 */
export interface ResourcePath {

    /**
     * The resource parent.
     * - null: The resource path is the root node.
     * - undefined: The resource path is relative path end.
     * - ResourcePath: The parent of the current path.
     */
    parent: ResourcePath | null | undefined;

    /**
     * The resource name.
     */
    name: string;

    /**
     * Resolve a path relative to the current path.
     *
     * - If the path is absolute, the absolute path is returned.
     * - If the path is relative, the relative path is returned.
     *
     * @param path The resolved path.
     * @returns A new resource path derived by applying given path. If the path
     * is absolute, the path is returned.
     * @throws {SyntaxError} The path is not possible.
     */
    resolve(path: ResourcePath | string): ResourcePath;

    /**
     * Is the path absolute.
     */
    absolute?: Readonly<boolean>;

    /**
     * Is the path relative.
     */
    relative?: Readonly<boolean>;
}

/**
 * Test, if a path is an abolute path.
 * @param path The tested path.
 * @returns The path is relative path. 
 */
export function isAbsolute(path: ResourcePath | undefined | null): boolean {
    let cursor = path;
    while (cursor != null && cursor.absolute != null) {
        cursor = cursor.parent;
    }
    return cursor.absolute != null ? cursor.absolute : cursor === null;
}

/**
 * Test, if a path is a relative path.
 * 
 * @param path The tested path.
 * @returns Is the path relative path.
 */
export function isRelative(path: ResourcePath | undefined | null): boolean {
    let cursor = path;
    while (cursor != null && cursor.relative != null) {
        cursor = cursor.parent;
    }
    return cursor.relative != null ? cursor.relative : cursor === undefined;
}

/**
 * Create a new resource path.
 * @param name The resource name.
 * @param parent The optional path of the parent. @default undefined.
 */
export function ResourcePath(name: string, parent: ResourcePath | undefined | null = undefined): ResourcePath {
    if (name === "")
        throw new SyntaxError("An empty path segment is not allowed");

    if (["..", "."].includes(name)) {

        if (isAbsolute(parent)) {
            throw new SyntaxError("Absolute path does not allow relative segments");
        } else if (parent != null) {
            // Removing the relative step and returning parent. 
            return parent;
        }
    }
    return {
        name,
        parent,
        resolve(path: ResourcePath | string): ResourcePath | undefined | null {
            return resolvePath(this, path);
        },
        absolute: parent == null ? parent === null : parent.absolute,
        relative: parent == null ? parent === undefined : parent.relative
    };
}

/**
 * Resolve a path from a current path and child path.
 * @param current The current path.
 * @param path The path appended to the current path.
 * @returns The resulting path.
 * @throws {SyntaxError} The current path or path was invalid.
 */
export function resolvePath(current: ResourcePath | null | undefined, path: ResourcePath | string): ResourcePath | undefined | null {
    let cursor: ResourcePath | undefined | null = undefined;
    const pathResources: string[] = [];
    const childPath = (typeof path === "string" ? ResourcePath(path) : path);
    cursor = childPath;
    while (cursor != null) {
        pathResources.unshift(cursor.name);
        cursor = cursor.parent;
    }
    if (cursor === undefined) {
        // Deriving path from current path - resolving the current path.
        let parent = cursor;
        pathResources.forEach((segment, index) => {
            if (segment === ".") {
                // Do nothing.
            } else if (segment === "..") {
                // Remove most recent path.
                if (parent == null) {
                    throw new SyntaxError("Invalid relative path at segment " + index + ".");
                }
                parent = parent.parent;
            } else if (segment == "") {
                throw SyntaxError(`Invalid path segment ${index}: An empty segment.`);
            } else if (segment !== ".") {
                parent = ResourcePath(segment, parent);
            }
        });
        return parent;
    } else if (pathResources.some(segment => [".", ".."].includes(segment))) {
        // Invalid child path for an absolute path.
        throw new SyntaxError("Absolute path cannot contain relative elements.");
    } else {
        // Returning the absolute path. 
        return childPath;
    }
}

/**
 * A resoruce change represents a chagne in resource.
 *
 * @template TYPE The type of the resource or property content.
 */
export interface ResourceChange<TYPE = string> {

    /**
     * The path of the altered resource.
     * - string: The name of the resource.
     * - ResourcePath: The path to the altered resource.
     */
    resource: ResourcePath | string;

    /**
     * The change type.
     */
    type: ResourceChangeType;

    /**
     * The new value. Undefined means the value is removed.
     */
    value?: TYPE;
}

/**
 * Add resource change.
 */
export interface ResourceAdded<TYPE = string> extends ResourceChange<TYPE> {

    resource: ResourcePath | string;

    type: "add";

    value: TYPE;
}

/**
 * Remove resource change.
 */
export interface ResourceRemoved<TYPE = string> extends ResourceChange<TYPE> {

    resource: ResourcePath | string;

    type: "remove";

}

/**
 * Update resource change.
 */
export interface ResourceChanged<TYPE = string> extends ResourceChange<TYPE> {

    resource: ResourcePath | string;

    type: "update";

    value: TYPE;
}

/**
 * Move resource change. The value is the path.
 */
export interface ResourceMoved<TYPE = string> extends ResourceChange<TYPE> {

    resource: string;

    type: "move";

    value?: TYPE;

    /**
     * The new resource location or name.
     * - string: The resource is renamed.
     * - ResourcePath: The resource is moved. The path may be relative.
     */
    newResource: ResourcePath | string;
}


/**
 * Parse JSON formatted resource changes. 
 * @param request The request with JSON content type. 
 * @returns The promise of the resource change list in the order of change. 
 */
export function parseJsonResourceChanges<TYPE>(request: Request): Promise<ResourceChange<TYPE>[]> {
    
    return Promise.reject(new Error("The parseJsonResourceChanges not implemented"));
}

/**
 * Parse XML formatted resource changes. 
 * @param request The request with XML content type. 
 * @returns The promise of the resource change list in the order of change. 
 */
export function parseXmlResourceChanges<TYPE>(request: Request): Promise<ResourceChange<TYPE>[]> {
    
    return Promise.reject(new Error("The parseXmlResourceChanges not implemented"));
}


export function parseResourceChanges<TYPE>(request: Request, contentType: string): Promise<ResourceChange<TYPE>[]> {
    switch(contentType) {
        case "application/json":
            return parseJsonResourceChanges(request);
        case "application/xml":
            return parseXmlResourceChanges(request);
        default:
            return Promise.reject();
    }
}