import React, { useEffect, useMemo, useState } from "react";
import {
  Star,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  AlertTriangle,
  Search,
  RefreshCw,
} from "lucide-react";
import { getFeedbacksApi } from "../../api/feedback.api";

const ITEMS_PER_PAGE = 10;

function normalizeFeedbackResponse(response) {
  // Supports Axios responses and API helpers that already return response.data.
  const payload = response?.data?.success !== undefined
    ? response.data
    : response;

  const rows = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.feedbacks)
      ? payload.feedbacks
      : Array.isArray(payload)
        ? payload
        : [];

  const pagination = payload?.pagination || null;

  return {
    rows,
    pagination,
    total: Number(
      pagination?.total ??
      payload?.total ??
      payload?.count ??
      rows.length
    ),
  };
}

export default function Feedback() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedShop, setSelectedShop] = useState("ALL");
  const [shopNameInput, setShopNameInput] = useState("");
  const [shopName, setShopName] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [serverPagination, setServerPagination] = useState(false);

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      setError("");

      const params = {
        page: currentPage,
        limit: ITEMS_PER_PAGE,
      };

      if (selectedShop !== "ALL") params.shopId = selectedShop;
      if (shopName.trim()) params.shopName = shopName.trim();

      // getFeedbacksApi must forward these params to GET /feedback.
      const response = await getFeedbacksApi(params);
      const normalized = normalizeFeedbackResponse(response);

      setFeedbacks(normalized.rows);
      setTotalRecords(normalized.total);
      setServerPagination(Boolean(normalized.pagination));
    } catch (err) {
      console.error("Failed to fetch feedbacks:", err);
      setFeedbacks([]);
      setTotalRecords(0);
      setError(
        err?.response?.data?.message ||
        err?.message ||
        "Unable to load customer feedbacks."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
    // fetchFeedbacks is intentionally invoked when server-side query inputs change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, selectedShop, shopName]);

  // Fallback for older APIs that return all rows without pagination metadata.
  const uniqueShops = useMemo(() => {
    const byId = new Map();
    feedbacks.forEach((item) => {
      if (item?.shopId != null && item?.shopName) {
        byId.set(String(item.shopId), {
          id: item.shopId,
          name: item.shopName,
        });
      }
    });
    return Array.from(byId.values()).sort((a, b) =>
      String(a.name).localeCompare(String(b.name))
    );
  }, [feedbacks]);

  const totalPages = Math.max(
    1,
    Math.ceil(totalRecords / ITEMS_PER_PAGE)
  );

  const currentFeedbacks = useMemo(() => {
    if (serverPagination) return feedbacks;

    // Client-side fallback for an API that still returns all records.
    const filtered = feedbacks.filter((item) => {
      const matchesShop =
        selectedShop === "ALL" ||
        String(item.shopId) === String(selectedShop);
      const matchesName =
        !shopName ||
        String(item.shopName || "")
          .toLowerCase()
          .includes(shopName.toLowerCase());
      return matchesShop && matchesName;
    });

    return filtered.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    );
  }, [
    feedbacks,
    serverPagination,
    selectedShop,
    shopName,
    currentPage,
  ]);

  const displayedTotal = serverPagination
    ? totalRecords
    : feedbacks.filter((item) => {
        const matchesShop =
          selectedShop === "ALL" ||
          String(item.shopId) === String(selectedShop);
        const matchesName =
          !shopName ||
          String(item.shopName || "")
            .toLowerCase()
            .includes(shopName.toLowerCase());
        return matchesShop && matchesName;
      }).length;

  const firstRecord =
    displayedTotal === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const lastRecord = Math.min(
    currentPage * ITEMS_PER_PAGE,
    displayedTotal
  );

  const applyShopNameFilter = (event) => {
    event.preventDefault();
    setCurrentPage(1);
    setShopName(shopNameInput.trim());
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 font-sans sm:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-extrabold text-[#3b1d00]">
              <MessageSquare className="h-7 w-7 text-orange-500" />
              Customer Feedback Panel
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Monitor ratings and reviews provided by customers across shops.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-2 shadow-sm">
              <label
                htmlFor="feedback-shop-filter"
                className="whitespace-nowrap text-xs font-bold uppercase tracking-wider text-gray-600"
              >
                Filter shop:
              </label>
              <select
                id="feedback-shop-filter"
                value={selectedShop}
                onChange={(event) => {
                  setCurrentPage(1);
                  setSelectedShop(event.target.value);
                }}
                className="min-w-0 cursor-pointer bg-transparent text-sm font-semibold text-[#2c1000] outline-none"
              >
                <option value="ALL">All Shops</option>
                {uniqueShops.map((shop) => (
                  <option key={shop.id} value={shop.id}>
                    {shop.name}
                  </option>
                ))}
              </select>
            </div>

            <form
              onSubmit={applyShopNameFilter}
              className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm"
            >
              <Search className="ml-1 h-4 w-4 shrink-0 text-gray-400" />
              <input
                type="text"
                value={shopNameInput}
                onChange={(event) => setShopNameInput(event.target.value)}
                placeholder="Search shop name"
                className="w-full min-w-0 bg-transparent px-1 py-1 text-sm outline-none sm:w-40"
                aria-label="Search shop name"
              />
              <button
                type="submit"
                className="rounded-xl bg-orange-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-orange-600"
              >
                Search
              </button>
              {shopName && (
                <button
                  type="button"
                  onClick={() => {
                    setShopNameInput("");
                    setShopName("");
                    setCurrentPage(1);
                  }}
                  className="rounded-xl px-2 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-100"
                >
                  Clear
                </button>
              )}
            </form>
          </div>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-600">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
            <button
              type="button"
              onClick={fetchFeedbacks}
              className="ml-auto inline-flex items-center gap-1 rounded-lg px-3 py-1.5 hover:bg-red-100"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          </div>
        )}

        <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-orange-100 bg-[#fcf7ec] text-xs font-extrabold uppercase tracking-wider text-[#4a2500]">
                  <th className="px-4 py-4 text-center">Sr. No</th>
                  <th className="px-4 py-4">Date</th>
                  <th className="px-4 py-4">Shop Name</th>
                  <th className="px-4 py-4">Customer Name</th>
                  <th className="px-4 py-4">Mobile No</th>
                  <th className="px-4 py-4 text-center">Rating</th>
                  <th className="px-6 py-4">Feedback</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm font-medium text-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400">
                      Loading feedback data from server...
                    </td>
                  </tr>
                ) : currentFeedbacks.length > 0 ? (
                  currentFeedbacks.map((item, index) => {
                    const srNo = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
                    const formattedDate = item.createdAt
                      ? new Date(item.createdAt).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "-";

                    return (
                      <tr
                        key={item.id ?? `${item.shopId}-${srNo}`}
                        className="transition-colors hover:bg-orange-50/40"
                      >
                        <td className="px-4 py-4 text-center font-bold text-gray-500">
                          {srNo}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-xs text-gray-600">
                          {formattedDate}
                        </td>
                        <td className="px-4 py-4 font-bold text-[#2c1000]">
                          {item.shopName || `Shop #${item.shopId ?? "-"}`}
                        </td>
                        <td className="px-4 py-4">{item.customerName || "-"}</td>
                        <td className="px-4 py-4 font-mono text-xs">
                          {item.mobile || "-"}
                        </td>
                        <td className="px-4 py-4 text-center">
                          {item.rating !== null && item.rating !== undefined ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                              {item.rating}
                            </span>
                          ) : (
                            <span className="text-xs italic text-gray-400">
                              No Rating
                            </span>
                          )}
                        </td>
                        <td
                          className="max-w-xs truncate px-6 py-4 text-gray-600"
                          title={item.feedbackText || ""}
                        >
                          {item.feedbackText || (
                            <span className="italic text-gray-400">
                              No comment
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-12 text-center font-semibold text-gray-400"
                    >
                      No feedback records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 bg-gray-50/80 px-4 py-4 sm:px-6">
            <div className="text-xs font-medium text-gray-500">
              Showing{" "}
              <span className="font-bold text-gray-700">{firstRecord}</span> to{" "}
              <span className="font-bold text-gray-700">{lastRecord}</span> of{" "}
              <span className="font-bold text-gray-700">{displayedTotal}</span>{" "}
              entries
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                disabled={loading || currentPage <= 1}
                aria-label="Previous page"
                className="rounded-xl border border-gray-200 bg-white p-2 text-gray-600 shadow-sm transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <span className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-[#2c1000]">
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() =>
                  setCurrentPage((page) => Math.min(page + 1, totalPages))
                }
                disabled={loading || currentPage >= totalPages}
                aria-label="Next page"
                className="rounded-xl border border-gray-200 bg-white p-2 text-gray-600 shadow-sm transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
