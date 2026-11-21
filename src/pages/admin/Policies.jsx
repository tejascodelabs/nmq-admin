import { useEffect, useState } from "react";
import {
  getAllPolicies,
  deletePolicy,
  updatePolicyStatus,
} from "../../api/policies.api";
import PoliciesFormModal from "../../components/policies/PoliciesFormModal";
import {
  Pencil as FiEdit2,
  Trash2 as FiTrash2,
  Plus as FiPlus,
  FileText as FiFileText,
} from "lucide-react";
import DeleteModal from "../../components/policies/DeleteModal";

export default function Policies() {
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchPages = async () => {
    try {
      setLoading(true);
      const res = await getAllPolicies();
      setPages(res.data?.data || []);
    } catch (error) {
      console.error("Error fetching pages:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const handleToggleStatus = async (page) => {
    try {
      const nextActive = page.isActive === false ? true : false;
      await updatePolicyStatus(page.id, { isActive: nextActive });
      fetchPages();
    } catch (error) {
      console.error("Error updating policy status:", error);
    }
  };

  const filteredPages = pages.filter(
    (page) =>
      page.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      page.type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTypeColor = (type = "") => {
    const colors = {
      privacy: "bg-blue-100 text-blue-800",
      terms: "bg-purple-100 text-purple-800",
      shipping: "bg-amber-100 text-amber-800",
      refund: "bg-green-100 text-green-800",
      cookie: "bg-rose-100 text-rose-800",
      default: "bg-gray-100 text-gray-800",
    };
    return colors[type.toLowerCase()] || colors.default;
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-linear-to-r from-secondary to-secondary rounded-xl">
                <FiFileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-primary">
                  Policy Pages
                </h1>
                <p className="text-gray-600 mt-1">
                  Manage your website's legal and policy pages
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search policies..."
                className="border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/20"
              />

              <button
                type="button"
                onClick={() => {
                  setSelectedPage(null);
                  setIsFormOpen(true);
                }}
                className="group flex items-center justify-center gap-2 bg-linear-to-r from-black to-gray-800 hover:from-gray-800 hover:to-black text-white px-5 py-3 rounded-xl font-medium transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <FiPlus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                <span>Create Page</span>
              </button>
            </div>
          </div>
        </div>

        {/* Policies Table */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-4 animate-pulse">
              {[1, 2, 3, 4].map((row) => (
                <div key={row} className="h-12 bg-gray-200 rounded-lg w-full" />
              ))}
            </div>
          ) : filteredPages.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold uppercase tracking-wider text-gray-600">
                    <th className="py-4 px-6">#</th>
                    <th className="py-4 px-6">Type</th>
                    <th className="py-4 px-6">Title</th>
                    <th className="py-4 px-6">Preview</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6">Last Updated</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {filteredPages.map((page, index) => {
                    const isActive = page.isActive !== false;
                    return (
                      <tr
                        key={page.id}
                        className="hover:bg-gray-50/80 transition-colors"
                      >
                        <td className="py-4 px-6 text-gray-500 font-medium">
                          {index + 1}
                        </td>
                        <td className="py-4 px-6 whitespace-nowrap">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(
                              page.type
                            )}`}
                          >
                            {page.type}
                          </span>
                        </td>
                        <td className="py-4 px-6 font-semibold text-gray-900">
                          {page.title}
                        </td>
                        <td className="py-4 px-6 text-gray-600 max-w-xs truncate">
                          {page.content
                            ? page.content
                                .replace(/<[^>]+>/g, " ")
                                .replace(/\s+/g, " ")
                                .trim()
                                .substring(0, 90) + "..."
                            : "No content available"}
                        </td>
                        <td className="py-4 px-6 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(page)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
                              isActive
                                ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            {isActive ? "Active" : "Inactive"}
                          </button>
                        </td>
                        <td className="py-4 px-6 text-gray-500 whitespace-nowrap">
                          {page.updatedAt || page.createdAt
                            ? new Date(
                                page.updatedAt || page.createdAt
                              ).toLocaleDateString()
                            : "N/A"}
                        </td>
                        <td className="py-4 px-6 whitespace-nowrap text-right">
                          <div className="inline-flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPage(page);
                                setIsFormOpen(true);
                              }}
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <FiEdit2 className="w-4 h-4 text-gray-700 hover:text-black" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(page)}
                              className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <FiTrash2 className="w-4 h-4 text-red-500 hover:text-red-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                  <FiFileText className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No pages found
                </h3>
                <p className="text-gray-600 mb-6">
                  {searchTerm
                    ? "No pages match your search. Try a different term."
                    : "Get started by creating your first policy page."}
                </p>
                {!searchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPage(null);
                      setIsFormOpen(true);
                    }}
                    className="inline-flex items-center gap-2 bg-linear-to-r from-black to-gray-800 hover:from-gray-800 hover:to-black text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    <FiPlus className="w-5 h-5" />
                    Create Your First Page
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Modal */}
      <PoliciesFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        selectedPage={selectedPage}
        onSaved={() => {
          setIsFormOpen(false);
          fetchPages();
        }}
      />

      {/* Delete Modal */}
      <DeleteModal
        isOpen={!!deleteTarget}
        title="Are you sure Delete Page?"
        description={
          deleteTarget
            ? `Delete "${deleteTarget.title}" (${deleteTarget.type})? This action cannot be undone.`
            : undefined
        }
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget?.id) return;
          await deletePolicy(deleteTarget.id);
          setDeleteTarget(null);
          fetchPages();
        }}
      />
    </div>
  );
}