import type { CheckerArgs, DecodedFile } from "./constants.mjs";
import type { EditorConfigProps } from "./constants.mjs";
import { decodeWithEncoding } from "./normalize.mjs";
import {
  detectEncodingMetadata,
  resolveInputCharsetAfterUtf8Failure,
} from "./detect.mjs";

export function decodeFile(
  raw: Buffer,
  relPath: string,
  repoRoot: string,
  editorProps: EditorConfigProps,
  args: CheckerArgs,
): DecodedFile {
  const meta = detectEncodingMetadata(raw, relPath, repoRoot, editorProps);
  let charset = meta.inputCharset;

  try {
    const text = decodeWithEncoding(raw, charset);
    return { text, encoding: charset, hadLeadingBom: meta.leadingUtf8Bom };
  } catch {
    if (meta.fromEditorConfig && meta.inputCharset === "utf-8") {
      charset = resolveInputCharsetAfterUtf8Failure(
        raw,
        meta.leadingUtf8Bom,
        relPath,
        args,
      );
      try {
        const text = decodeWithEncoding(raw, charset);
        return { text, encoding: charset, hadLeadingBom: meta.leadingUtf8Bom };
      } catch {
        throw new Error("decode failed");
      }
    }
    throw new Error("decode failed");
  }
}
