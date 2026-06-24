import { useState } from "react";
import { format } from "date-fns";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { useTransactions, Transaction } from "@/hooks/use-transactions";
import { formatCurrency, formatCrypto, cn } from "@/lib/formatters";
import { Layout } from "@/components/layout";
import { TransactionForm } from "@/components/transaction-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Transactions() {
  const { transactions, deleteTransaction } = useTransactions();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [deletingTxId, setDeletingTxId] = useState<string | null>(null);

  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const handleEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setIsFormOpen(true);
  };

  const handleAddNew = () => {
    setEditingTx(null);
    setIsFormOpen(true);
  };

  const confirmDelete = () => {
    if (deletingTxId) {
      deleteTransaction(deletingTxId);
      setDeletingTxId(null);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col gap-6 pb-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-card-foreground">Transaction History</h1>
          <Button onClick={handleAddNew} className="shadow-sm">
            <Plus className="w-4 h-4 mr-2" />
            Add
          </Button>
        </div>

        <Card className="shadow-sm overflow-hidden border-border flex flex-col">
          <CardHeader className="bg-muted/30 border-b border-border pb-4">
            <CardTitle className="text-base font-semibold">All Transactions</CardTitle>
          </CardHeader>
          
          {sortedTransactions.length === 0 ? (
            <CardContent className="py-16 text-center text-muted-foreground flex flex-col items-center">
              <p>No transactions found.</p>
              <Button variant="link" onClick={handleAddNew} className="mt-2 text-primary">
                Record your first trade
              </Button>
            </CardContent>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Asset</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-sm font-medium whitespace-nowrap">
                        {format(new Date(tx.date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "font-mono uppercase text-[10px] tracking-wider",
                            tx.type === "buy" 
                              ? "bg-primary/10 text-primary border-primary/20" 
                              : "bg-destructive/10 text-destructive border-destructive/20"
                          )}
                        >
                          {tx.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {tx.image && <img src={tx.image} alt="" className="w-6 h-6 rounded-full shadow-sm" />}
                          <div className="flex flex-col">
                            <span className="font-semibold text-sm">{tx.name}</span>
                            <span className="text-xs font-mono text-muted-foreground uppercase">{tx.symbol}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatCurrency(tx.pricePerCoin)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        <span className={cn(tx.type === "buy" ? "text-profit" : "text-loss")}>
                          {tx.type === "buy" ? "+" : "-"}{formatCrypto(tx.quantity)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {formatCurrency(tx.quantity * tx.pricePerCoin)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleEdit(tx)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeletingTxId(tx.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>

      <TransactionForm
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setEditingTx(null);
        }}
        transactionToEdit={editingTx}
      />

      <AlertDialog open={!!deletingTxId} onOpenChange={(open) => !open && setDeletingTxId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the transaction
              from your local history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Transaction
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
