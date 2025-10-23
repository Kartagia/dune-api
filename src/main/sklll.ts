
/**
 * An interface representing a skill. 
 */
export interface Skill {
    name: string,
    description?: string
}

/**
 * Create a new skill.
 * @param name The name of the skill.
 * @param description The description of the skill. 
 * @returns A skill.
 * @throws {SyntaxError} The name or the description is invalid. 
 */
export function Skill(name: string, description: string | undefined = undefined): Skill {
    return {
        name, description
    }
}