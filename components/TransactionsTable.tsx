import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { transactionCategoryStyles } from "@/constants";
import {
  cn,
  formatAmount,
  formatDateTime,
  getTransactionStatus,
  removeSpecialCharacters,
} from "@/lib/utils";

const CategoryBadge = ({ category }: CategoryBadgeProps) => {
  const { borderColor, backgroundColor, textColor, chipBackgroundColor } =
    transactionCategoryStyles[
      category as keyof typeof transactionCategoryStyles
    ] || transactionCategoryStyles.default;

  return (
    <div className={cn("category-badge", borderColor, chipBackgroundColor)}>
      <div className={cn("size-2 rounded-full", backgroundColor)} />
      <p className={cn("text-[12px] font-medium", textColor)}>{category}</p>
    </div>
  );
};

const TransactionsTable = ({ transactions }: TransactionTableProps) => {
  if (!transactions || transactions.length === 0) {
    return (
      <Table className="bg-black text-white">
        <TableHeader className="bg-gray-900">
          <TableRow>
            <TableHead className="px-2 text-gray-300">Transaction</TableHead>
            <TableHead className="px-2 text-gray-300">Amount</TableHead>
            <TableHead className="px-2 text-gray-300">Status</TableHead>
            <TableHead className="px-2 text-gray-300">Date</TableHead>
            <TableHead className="px-2 text-gray-300">Auth Date</TableHead>
            <TableHead className="px-2 text-gray-300">Time</TableHead>
            <TableHead className="px-2 max-md:hidden text-gray-300">
              Channel
            </TableHead>
            <TableHead className="px-2 max-md:hidden text-gray-300">
              Category
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell colSpan={6} className="text-center py-4 text-gray-400">
              No transactions found
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
  }

  return (
    <Table className="bg-black text-white border-gray-800">
      <TableHeader className="bg-gray-900">
        <TableRow>
          <TableHead className="px-2 text-gray-300">Transaction</TableHead>
          <TableHead className="px-2 text-gray-300">Amount</TableHead>
          <TableHead className="px-2 text-gray-300">Status</TableHead>
          <TableHead className="px-2 text-gray-300">Date</TableHead>
          <TableHead className="px-2 text-gray-300">Auth Date</TableHead>
          <TableHead className="px-2 text-gray-300">Time</TableHead>
          <TableHead className="px-2 max-md:hidden text-gray-300">
            Channel
          </TableHead>
          <TableHead className="px-2 max-md:hidden text-gray-300">
            Category
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className="border-gray-800">
        {transactions.map((t: Transaction) => {
          const status = getTransactionStatus(new Date(t.date));
          const amount = formatAmount(t.amount);

          const isDebit = t.type === "debit";
          const isCredit = t.type === "credit";

          // Format time for display
          const getTimeString = (dateString: string | undefined) => {
            if (!dateString) return "—";
            const date = new Date(dateString);
            return date.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });
          };

          return (
            <TableRow
              key={t.id}
              className={`${
                isDebit || amount[0] === "-" ? "bg-gray-900" : "bg-gray-800"
              } hover:bg-gray-700 border-gray-700`}
            >
              <TableCell className="max-w-[250px] pl-2 pr-10 text-gray-200">
                <div className="flex items-center gap-3">
                  <h1 className="text-14 truncate font-semibold text-gray-200">
                    {removeSpecialCharacters(t.name)}
                  </h1>
                </div>
              </TableCell>

              <TableCell
                className={`pl-2 pr-10 font-semibold ${
                  isDebit || amount[0] === "-"
                    ? "text-red-400"
                    : "text-green-400"
                }`}
              >
                {isDebit ? `-${amount}` : isCredit ? amount : amount}
              </TableCell>

              <TableCell className="pl-2 pr-10">
                <CategoryBadge category={status} />
              </TableCell>

              <TableCell className="min-w-32 pl-2 pr-10 text-gray-300">
                {formatDateTime(new Date(t.date)).dateTime}
              </TableCell>

              <TableCell className="min-w-32 pl-2 pr-10 text-gray-300">
                {t.authorizedDate
                  ? formatDateTime(new Date(t.authorizedDate)).dateTime
                  : "—"}
              </TableCell>

              <TableCell className="min-w-24 pl-2 pr-10 text-gray-300">
                {getTimeString(t.timestamp)}
              </TableCell>

              <TableCell className="pl-2 pr-10 capitalize min-w-24 text-gray-300">
                {t.paymentChannel}
              </TableCell>

              <TableCell className="pl-2 pr-10 max-md:hidden">
                <CategoryBadge category={t.category} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};

export default TransactionsTable;
