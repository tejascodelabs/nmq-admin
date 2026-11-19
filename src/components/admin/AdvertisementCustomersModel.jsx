
import { useEffect, useState } from "react";
import { Users, X, Download } from "lucide-react";
import * as XLSX from "xlsx";
import api from "../../api/axios";

export default function AdvertisementCustomersModel({
  advertisement,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [customers, setCustomers] = useState(advertisement?.customer_click_list ?? []);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    setCustomers(advertisement?.customer_click_list ?? []);
  }, [advertisement?.id, advertisement?._id, advertisement?.customer_click_list]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const id = advertisement?.id ?? advertisement?._id;
    if (!id) {
      setLoadError("Advertisement ID is missing.");
      return undefined;
    }

    let active = true;
    setLoading(true);
    setLoadError("");
    api.get(`/advertisements/${id}/clicks`)
      .then((response) => {
        if (!active) return;
        const payload = response.data?.data ?? response.data;
        setCustomers(Array.isArray(payload) ? payload : payload?.customers ?? []);
      })
      .catch((error) => {
        if (!active) return;
        setLoadError(error.response?.data?.message || "Failed to load customer clicks.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [isOpen, advertisement?.id, advertisement?._id]);

  const exportExcel = () => {
    if (customers.length === 0) return;

    const rows = customers.map((customer, index) => ({
      "Sr. No.": index + 1,
      "Customer Name": customer.customer_name ?? customer.customerName ?? "-",
      "Mobile Number": customer.mobile_no ?? customer.customerMobile ?? "-",
      "Shop Name": customer.shop_name ?? customer.shopName ?? "-",
      Placement: customer.placement || "-",
      "Click Count": Number(customer.click_count ?? customer.clickCount ?? 0),
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);

    worksheet["!cols"] = [
      { wch: 10 },
      { wch: 24 },
      { wch: 18 },
      { wch: 28 },
      { wch: 18 },
      { wch: 14 },
    ];

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Customers"
    );

    const fileName = `advertisement-${advertisement.id ?? advertisement._id}-customers.xlsx`;

    XLSX.writeFile(workbook, fileName);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
      >
        <Users size={17} />
        Customers
        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs">
          {customers.length}
        </span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3 sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsOpen(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-modal-title"
            className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 p-5">
              <div>
                <h2
                  id="customer-modal-title"
                  className="text-lg font-bold text-gray-900 sm:text-xl"
                >
                  Advertisement Customers
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {advertisement.eventTitle || advertisement.event_title ||
                    `Advertisement #${advertisement.id ?? advertisement._id}`}
                  {" · "}
                  {customers.length} customer records
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close customer list"
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              >
                <X size={21} />
              </button>
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-gray-50 px-5 py-4">
              <div>
                <p className="font-semibold text-gray-800">
                  Customer Click List
                </p>
                <p className="text-xs text-gray-500">
                  Advertisement ID: {advertisement.id ?? advertisement._id}
                </p>
              </div>

              <button
                type="button"
                onClick={exportExcel}
                disabled={customers.length === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download size={17} />
                Export Excel
              </button>
            </div>

            {/* Customer Table */}
            {loadError && <p role="alert" className="px-5 py-3 text-sm text-red-600">{loadError}</p>}
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full min-w-[850px] border-collapse text-left text-sm">
                <thead className="sticky top-0 z-10 bg-gray-100 text-gray-600">
                  <tr>
                    <th className="px-5 py-3 font-semibold">#</th>
                    <th className="px-5 py-3 font-semibold">
                      Customer Name
                    </th>
                    <th className="px-5 py-3 font-semibold">
                      Mobile Number
                    </th>
                    <th className="px-5 py-3 font-semibold">
                      Shop Name
                    </th>
                    <th className="px-5 py-3 font-semibold">
                      Placement
                    </th>
                    <th className="px-5 py-3 text-center font-semibold">
                      Click Count
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-500">Loading customer clicks...</td></tr>
                  ) : customers.length > 0 ? (
                    customers.map((customer, index) => (
                      <tr
                        key={customer.id ?? index}
                        className="transition hover:bg-gray-50"
                      >
                        <td className="px-5 py-4 text-gray-500">
                          {index + 1}
                        </td>

                        <td className="px-5 py-4 font-medium text-gray-900">
                          {customer.customer_name ?? customer.customerName ?? "-"}
                        </td>

                        <td className="px-5 py-4 text-gray-700">
                          {customer.mobile_no ?? customer.customerMobile ?? "-"}
                        </td>

                        <td className="px-5 py-4 text-gray-700">
                          {customer.shop_name ?? customer.shopName ?? "-"}
                        </td>

                        <td className="px-5 py-4">
                          <span className="rounded-md bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700">
                            {customer.placement || "-"}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-center font-semibold text-gray-900">
                          {customer.click_count ?? customer.clickCount ?? 0}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-14 text-center"
                      >
                        <Users
                          size={36}
                          className="mx-auto mb-3 text-gray-300"
                        />
                        <p className="font-medium text-gray-700">
                          No customers yet
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          Customer clicks will appear here.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between gap-3 border-t border-gray-200 px-5 py-4">
              <p className="text-sm text-gray-500">
                Total records: {customers.length}
              </p>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
