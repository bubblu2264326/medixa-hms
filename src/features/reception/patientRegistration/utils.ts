/**
 * Auto-formats a CNIC string as XXXXX-XXXXXXX-X
 * Strips non-digits and inserts dashes at positions 5 and 12.
 */
export function formatCNIC(raw: string): string {
    const digits = raw.replace(/\D/g, "").slice(0, 13);
    if (digits.length <= 5) return digits;
    if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

/**
 * CNIC display mask — shows _____-_______-_ with filled digits
 */
export function cnicMask(value: string): string {
    const digits = (value || "").replace(/\D/g, "");
    const template = "_____-_______-_";
    let result = "";
    let di = 0;
    for (const ch of template) {
        if (ch === "_") {
            result += di < digits.length ? digits[di++] : "_";
        } else {
            result += ch;
        }
    }
    return result;
}

/**
 * Auto-formats a phone number, ensuring it starts with "03"
 * Format: 03XX XXXXXXX (11 digits total)
 */
export function formatPhone(raw: string): string {
    let digits = raw.replace(/\D/g, "").slice(0, 11);
    // Ensure starts with 03
    if (digits.length >= 1 && digits[0] !== "0") digits = "0" + digits;
    if (digits.length >= 2 && digits[1] !== "3") digits = "03" + digits.slice(2);
    if (digits.length <= 4) return digits;
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
}

/**
 * Phone display mask — shows 03__-_______ with filled digits
 */
export function phoneMask(value: string): string {
    const digits = (value || "").replace(/\D/g, "");
    const template = "03__-_______";
    let result = "";
    let di = 0;
    for (let i = 0; i < template.length; i++) {
        const ch = template[i];
        if (ch === "_") {
            result += di < digits.length ? digits[di++] : "_";
        } else if (ch === "0" || ch === "3") {
            // static prefix — skip matching digit
            if (di < digits.length && digits[di] === ch) di++;
            result += ch;
        } else {
            result += ch;
        }
    }
    return result;
}

export const RELATION_TAGS = ["W/O", "D/O", "S/O", "C/O"] as const;
export type RelationTag = (typeof RELATION_TAGS)[number];

function normalizeRelationTag(value: string | null | undefined): RelationTag | null {
    if (!value) return null;
    const normalized = value.trim().toUpperCase();
    if (normalized === "W/O" || normalized === "D/O" || normalized === "S/O" || normalized === "C/O") {
        return normalized;
    }
    return null;
}

/**
 * Split a stored patient name into optional relation tag and base name.
 * Examples:
 * - "W/O Hashim" -> { tag: "W/O", baseName: "Hashim" }
 * - "Hashim" -> { tag: null, baseName: "Hashim" }
 */
export function splitPatientName(storedName: string): { tag: RelationTag | null; baseName: string } {
    const value = (storedName || "").trim().replace(/\s+/g, " ");
    if (!value) return { tag: null, baseName: "" };

    const match = value.match(/^(W\/O|D\/O|S\/O|C\/O)\s+(.+)$/i);
    if (!match) {
        return { tag: null, baseName: value };
    }

    const tag = normalizeRelationTag(match[1]);
    const baseName = (match[2] || "").trim().replace(/\s+/g, " ");
    return { tag, baseName };
}

/**
 * Compose the patient_name field to be sent to backend.
 * - Selected tag takes precedence
 * - If selected tag is empty, preserve manually-typed leading tag when present
 * - Prevent duplicate prefixes
 */
export function composePatientName(selectedTag: string, rawInput: string): string {
    const { tag: typedTag, baseName } = splitPatientName(rawInput || "");
    const resolvedTag = normalizeRelationTag(selectedTag) || typedTag;
    const normalizedBaseName = baseName.trim().replace(/\s+/g, " ");

    if (!normalizedBaseName) return "";
    if (!resolvedTag) return normalizedBaseName;

    return `${resolvedTag} ${normalizedBaseName}`;
}
