/**
 * Helpers for OpenAI strict Structured Outputs JSON Schema.
 * Every object: additionalProperties=false and required === Object.keys(properties).
 */

export type JsonSchemaObject = {
  type: "object";
  additionalProperties: false;
  properties: Record<string, unknown>;
  required: string[];
};

export function strictObject(
  properties: Record<string, unknown>
): JsonSchemaObject {
  return {
    type: "object",
    additionalProperties: false,
    properties,
    required: Object.keys(properties),
  };
}

export function str() {
  return { type: "string" as const };
}
export function num() {
  return { type: "number" as const };
}
export function int() {
  return { type: "integer" as const };
}
export function bool() {
  return { type: "boolean" as const };
}
export function strOrNull() {
  return { anyOf: [{ type: "string" as const }, { type: "null" as const }] };
}
export function numOrNull() {
  return { anyOf: [{ type: "number" as const }, { type: "null" as const }] };
}
export function arr(items: unknown) {
  return { type: "array" as const, items };
}

/** Recursively assert OpenAI strict object rules. */
export function assertStrictSchemaCompliance(
  node: unknown,
  path = "$"
): string[] {
  const errors: string[] = [];
  if (!node || typeof node !== "object") return errors;
  const n = node as Record<string, unknown>;

  if (n.type === "object") {
    if (n.additionalProperties !== false) {
      errors.push(`${path}: additionalProperties must be false`);
    }
    const props = (n.properties || {}) as Record<string, unknown>;
    const required = (n.required || []) as string[];
    const keys = Object.keys(props).sort();
    const req = [...required].sort();
    if (keys.join(",") !== req.join(",")) {
      errors.push(
        `${path}: required [${req.join(",")}] !== properties [${keys.join(",")}]`
      );
    }
    for (const [k, v] of Object.entries(props)) {
      errors.push(...assertStrictSchemaCompliance(v, `${path}.${k}`));
    }
  }

  if (n.anyOf && Array.isArray(n.anyOf)) {
    n.anyOf.forEach((child, i) =>
      errors.push(...assertStrictSchemaCompliance(child, `${path}.anyOf[${i}]`))
    );
  }
  if (n.items) {
    errors.push(...assertStrictSchemaCompliance(n.items, `${path}.items`));
  }
  return errors;
}
