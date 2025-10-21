
/**
 * @module HATEOAS 
 */

import type { URL } from "node:url";
import type { ResourcePath } from "./resourcepath.ts";
import { DOMParser, XMLSerializer  } from '@xmldom/xmldom';
import { escape } from "node:querystring";

/**
 * The rest method type. 
 */
export type RestMethod = ("GET" | "POST" | "PATCH" | "PUT" | "DELETE");

/**
 * A resource link represents a link to a resource.
 */
export interface ResourceLink {
    /**
     * The HTTP reference of the resource. 
     */
    href: URL | string | ResourcePath;

    /**
     * The relation of the linked resource. 
     */
    rel: string | ResourcePath;

    /**
     * The method type of the link.
     */
    type: RestMethod;

    /**
     * The HTTP header link.
     */
    toHeader(): string;
}

/**
 * A resource link with JSON representation.
 */
export interface JsonLink extends ResourceLink {

    /**
     * Convert the link to JSON.
     * 
     * @return The link as JSON. 
     */
    toJSON(): string;
}

/**
 * A resource link with XML representation.
 */
export interface XmlLink extends ResourceLink {
    /**
     * Convert the link to XML.
     * 
     * @return The link as XML document. 
     */
    toXML(document: Document): string;

}

/**
 * Create a new XML resource link. 
 * 
 * @param href The hyperlink of the link.
 * @param rel The relationship of the link.
 * @param type The method of the link. 
 * @returns The created XML link. 
 */
export function XmlLink(href: URL | string | ResourcePath, rel: string | ResourcePath, type: RestMethod = "GET"): XmlLink {

    return {
        ...ResourceLink(href, rel, type),
        toXML(document: Document): string {
            const result = document.createElement("link");
            result.setAttribute("href", this.href.toString());
            result.setAttribute("rel", this.rel.toString());
            result.setAttribute("type", this.type);
            return new XMLSerializer().serializeToString(result); 
        }
    };
}



/**
 * Create a new resource link. 
 * 
 * @param href The hyperlink of the link.
 * @param rel The relationship of the link.
 * @param type The method of the link. 
 * @returns The created resource link.  
 */
export function ResourceLink(href: URL | string | ResourcePath, rel: string | ResourcePath, type: RestMethod = "GET"): ResourceLink {

    return {
        href,
        type,
        rel,
        toHeader(): string {
            let result: "Link: ";
            result += `<${escape(this.href)}>; rel="${escape(this.rel)}"`
            return result;
        }
    };
}