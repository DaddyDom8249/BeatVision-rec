import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const frontend = path.join(root, 'app', 'frontend', 'src');

async function patch(file, replacements) {
  const fullPath = path.join(frontend, file);
  let source = await readFile(fullPath, 'utf8');
  for (const [before, after] of replacements) {
    if (!source.includes(before)) {
      throw new Error(`Integration patch anchor not found in ${file}: ${before.slice(0, 100)}`);
    }
    source = source.replace(before, after);
  }
  await writeFile(fullPath, source);
}

await patch('pages/CreateProject.jsx', [
  [
    'import { newProject, upsertProject, StorageQuotaError } from "@/lib/storage";',
    'import { newProject, upsertProject, StorageQuotaError } from "@/lib/storage";\nimport { saveStoredAudioFile, removeStoredAudioFile, validateAudioFile } from "@/lib/audioStorage";',
  ],
  [
    '  const [form, setForm] = useState({',
    '  const [audioFile, setAudioFile] = useState(null);\n  const [audioError, setAudioError] = useState("");\n\n  const [form, setForm] = useState({',
  ],
  [
    '  function handleReveal() {\n    if (!form.title.trim()) {',
    '  function readAudioDuration(file) {\n    return new Promise((resolve, reject) => {\n      const url = URL.createObjectURL(file);\n      const audio = document.createElement("audio");\n      const cleanup = () => {\n        audio.removeAttribute("src");\n        try { audio.load(); } catch {}\n        URL.revokeObjectURL(url);\n      };\n      const timeoutId = window.setTimeout(() => {\n        cleanup();\n        reject(new Error("The song metadata took too long to load."));\n      }, 30000);\n      audio.preload = "metadata";\n      audio.onloadedmetadata = () => {\n        window.clearTimeout(timeoutId);\n        const duration = audio.duration;\n        cleanup();\n        if (!Number.isFinite(duration) || duration <= 0) {\n          reject(new Error("The song duration could not be read."));\n          return;\n        }\n        resolve(duration);\n      };\n      audio.onerror = () => {\n        window.clearTimeout(timeoutId);\n        cleanup();\n        reject(new Error("The selected song could not be opened."));\n      };\n      audio.src = url;\n    });\n  }\n\n  async function handleAudioChange(event) {\n    const file = event.target.files?.[0] || null;\n    event.target.value = "";\n    setAudioError("");\n    if (!file) {\n      setAudioFile(null);\n      return;\n    }\n    try {\n      validateAudioFile(file);\n      await readAudioDuration(file);\n      setAudioFile(file);\n    } catch (error) {\n      setAudioFile(null);\n      setAudioError(error.message || "The selected song could not be used.");\n    }\n  }\n\n  async function handleReveal() {\n    if (!form.title.trim()) {',
  ],
  [
    '    const project = newProject(form);\n\n    try {\n      const saved = upsertProject(project);',
    '    const project = newProject(form);\n\n    try {\n      if (audioFile) {\n        const duration = await readAudioDuration(audioFile);\n        const metadata = await saveStoredAudioFile(project.id, audioFile, { duration });\n        project.audioMetadata = {\n          name: audioFile.name,\n          type: audioFile.type || "audio/*",\n          size: audioFile.size,\n          duration,\n          storageType: metadata.storageType,\n        };\n      }\n\n      const saved = upsertProject(project);',
  ],
  [
    '      console.error(error);\n\n      if (',
    '      console.error(error);\n      if (project?.id) {\n        try { await removeStoredAudioFile(project.id); } catch {}\n      }\n      if (audioFile) setAudioError(error.message || "The selected song could not be stored.");\n\n      if (',
  ],
  [
    '        <div>\n          <label className="bv-label">Lyrics</label>',
    '        <div>\n          <label className="bv-label">Song Audio (optional)</label>\n          <div className="text-xs text-neutral-500 font-body mb-3">\n            Add the original song once. BeatVision stores the audio locally in the browser so the export step can reuse it.\n          </div>\n          <label className="btn-ghost inline-flex items-center gap-2 cursor-pointer">\n            Choose Song\n            <input\n              type="file"\n              accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac"\n              className="hidden"\n              onChange={handleAudioChange}\n            />\n          </label>\n          {audioFile && (\n            <div className="mt-3 text-sm font-body text-neutral-300">\n              {audioFile.name} <span className="text-neutral-500">({Math.round(audioFile.size / 1024 / 1024 * 10) / 10} MB)</span>\n            </div>\n          )}\n          {audioError && <div className="mt-2 text-sm text-[#F87171] font-body">{audioError}</div>}\n        </div>\n\n        <div>\n          <label className="bv-label">Lyrics</label>',
  ],
]);

await patch('components/MotionExportPanel.jsx', [
  [
    'import { MOTION_TYPES } from "@/lib/constants";',
    'import { MOTION_TYPES } from "@/lib/constants";\nimport { getStoredAudioFile, saveStoredAudioFile, removeStoredAudioFile, validateAudioFile } from "@/lib/audioStorage";\nimport { updateProject } from "@/lib/storage";',
  ],
  [
    '  useEffect(() => {\n    // React StrictMode runs an extra setup/cleanup cycle in development.',
    '  useEffect(() => {\n    let cancelled = false;\n    (async () => {\n      try {\n        const stored = await getStoredAudioFile(project.id);\n        if (!stored || cancelled) return;\n        const duration = await readAudioDuration(stored);\n        if (cancelled) return;\n        setAudioFile(stored);\n        setAudioDuration(duration);\n        setAudioError("");\n      } catch (error) {\n        if (!cancelled) setAudioError(error.message || "Stored song could not be reopened. Please re-select it.");\n      }\n    })();\n\n    // React StrictMode runs an extra setup/cleanup cycle in development.',
  ],
  [
    '    return () => {\n      mountedRef.current = false;',
    '    return () => {\n      cancelled = true;\n      mountedRef.current = false;',
  ],
  [
    '    setAudioFile(file);\n    setAudioDuration(null);\n\n    try {\n      const duration = await readAudioDuration(file);',
    '    setAudioFile(file);\n    setAudioDuration(null);\n\n    try {\n      validateAudioFile(file);\n      const duration = await readAudioDuration(file);',
  ],
  [
    '      setAudioDuration(duration);\n    } catch (error) {',
    '      setAudioDuration(duration);\n      const metadata = await saveStoredAudioFile(project.id, file, { duration });\n      updateProject(project.id, {\n        audioMetadata: {\n          name: file.name,\n          type: file.type || "audio/*",\n          size: file.size,\n          duration,\n          storageType: metadata.storageType,\n        },\n      });\n    } catch (error) {',
  ],
  [
    '  function clearAudioSelection() {\n    audioSelectionIdRef.current += 1;\n    setAudioFile(null);\n    setAudioDuration(null);\n    setAudioError("");\n    setRenderError("");\n    clearRenderedVideo();\n    if (fileInputRef.current) fileInputRef.current.value = "";\n  }',
    '  function clearAudioSelection() {\n    audioSelectionIdRef.current += 1;\n    setAudioFile(null);\n    setAudioDuration(null);\n    setAudioError("");\n    setRenderError("");\n    clearRenderedVideo();\n    if (fileInputRef.current) fileInputRef.current.value = "";\n    void removeStoredAudioFile(project.id);\n    updateProject(project.id, { audioMetadata: null });\n  }',
  ],
  [
    '              BeatVision does not keep large audio files in browser storage. Re-select the original song for each export session.',
    '              BeatVision keeps the selected song in browser-local storage so approved scenes can be exported without re-selecting the file after every page load.',
  ],
  [
    '          Re-select song for export',
    '          {audioFile ? "Replace song" : "Select song for export"}',
  ],
]);

await patch('pages/ProjectWorkflow.jsx', [
  [
    '        sourceType: "generated_from_reference",',
    '        sourceType: "generated_ai",',
  ],
  [
    '          data.referenceMode ||\n          "direct_reference_images",',
    '          data.referenceMode ||\n          "metadata_prompt_only",',
  ],
]);

await patch('pages/Settings.jsx', [
  [
    '    what: "Turns approved scene prompts into cinematic scene images. Provider: Google Gemini Nano Banana.",\n    cost: "Uses Emergent LLM credits when connected.",',
    '    what: "Turns approved scene prompts into cinematic scene images. The connected provider is shown below.",\n    cost: "Cost is reported by the connected provider.",',
  ],
  [
    '    what: "Uses your uploaded reference photos to guide each generated scene image. Provider: Google Gemini Nano Banana.",\n    cost: "Uses Emergent LLM credits when connected.",',
    '    what: "Uses selected reference metadata or provider-supported reference inputs to guide each scene image. The connected provider is shown below.",\n    cost: "Reference handling and cost are reported by the connected provider.",',
  ],
]);

const manifestPath = path.join(root, 'app', 'integration-manifest.json');
let manifest = await readFile(manifestPath, 'utf8');
manifest = manifest.replace(
  'providerExecution: \'Arena worker/provider contracts integrated under integrations/arena-provider\'',
  'providerExecution: \'Recovery provider path is active; Arena worker/provider contracts are preserved as optional integration references\''
);
await writeFile(manifestPath, manifest);

console.log('BeatVision-rec integration overrides applied.');
