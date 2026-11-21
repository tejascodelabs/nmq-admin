import { useEffect, useRef, useState } from "react";
import JoditEditor from "jodit-react";
import { createPolicy, updatePolicy } from "../../api/policies.api";

const PAGE_TYPES = [
  "TERMS",
  "PRIVACY",
  "SHIPPING",
  "REFUND",
  "COOKIE",
];

const INITIAL_FORM = {
  type: "",
  title: "",
  content: "",
  isActive: true,
};

export default function PoliciesFormModal({
  isOpen,
  onClose,
  selectedPage,
  onSaved,
}) {
  const editor = useRef(null);

  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    setErrorMsg("");
    if (selectedPage) {
      setForm({
        type: selectedPage.type || "",
        title: selectedPage.title || "",
        content: selectedPage.content || "",
        isActive:
          typeof selectedPage.isActive === "boolean"
            ? selectedPage.isActive
            : true,
      });
    } else {
      setForm(INITIAL_FORM);
    }
  }, [selectedPage, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    try {
      setSubmitting(true);
      if (selectedPage?.id) {
        await updatePolicy(selectedPage.id, form);
      } else {
        await createPolicy(form);
      }
      onSaved();
      onClose();
    } catch (error) {
      setErrorMsg(
        error?.response?.data?.message || "Failed to save policy page"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold">
          {selectedPage ? "Edit Page" : "Create Page"}
        </h2>

        {errorMsg && (
          <div className="p-3 rounded bg-red-50 text-red-700 text-sm border border-red-200">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* PAGE TYPE */}
          <select
            value={form.type}
            disabled={!!selectedPage}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="w-full border p-2 rounded disabled:bg-gray-100"
            required
          >
            <option value="">Select Page Type</option>
            {PAGE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          {/* TITLE */}
          <input
            type="text"
            placeholder="Page Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full border p-2 rounded"
            required
          />

          {/* ACTIVE STATUS */}
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) =>
                setForm({ ...form, isActive: e.target.checked })
              }
            />
            Active Policy
          </label>

          {/* CONTENT (JODIT) */}
          <JoditEditor
            ref={editor}
            value={form.content}
            config={{
              readonly: false,
              height: 350,
              toolbarAdaptive: false,
              toolbarSticky: false,
              buttons: [
                "bold",
                "italic",
                "underline",
                "ul",
                "ol",
                "link",
                "image",
                "align",
                "undo",
                "redo",
                "hr",
                "eraser",
                "source",
              ],
            }}
            onBlur={(newContent) => setForm({ ...form, content: newContent })}
          />

          {/* ACTIONS */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 border rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-black text-white rounded disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}