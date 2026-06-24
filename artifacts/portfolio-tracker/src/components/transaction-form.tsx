import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, Check, ChevronsUpDown, Loader2, Search } from "lucide-react";
import { Transaction, useTransactions } from "@/hooks/use-transactions";
import { useCoinSearch, useSimplePrice } from "@/hooks/use-coingecko";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/formatters";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";

const formSchema = z.object({
  type: z.enum(["buy", "sell"]),
  coinId: z.string().min(1, "Please select an asset"),
  symbol: z.string(),
  name: z.string(),
  image: z.string(),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  pricePerCoin: z.coerce.number().positive("Price must be greater than 0"),
  date: z.date({ required_error: "Please select a date" }),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function TransactionForm({
  open,
  onOpenChange,
  transactionToEdit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionToEdit?: Transaction | null;
}) {
  const { addTransaction, editTransaction } = useTransactions();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const { data: searchResults, isLoading: isSearching } = useCoinSearch(debouncedSearch);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "buy",
      coinId: "",
      symbol: "",
      name: "",
      image: "",
      quantity: 0,
      pricePerCoin: 0,
      date: new Date(),
      note: "",
    },
  });

  const selectedCoinId = form.watch("coinId");
  const { data: currentPrice } = useSimplePrice(selectedCoinId);

  // Auto-fill price when a coin is selected and no price is set, or if price was 0
  useEffect(() => {
    if (currentPrice && form.getValues("pricePerCoin") === 0) {
      form.setValue("pricePerCoin", currentPrice, { shouldValidate: true });
    }
  }, [currentPrice, form]);

  useEffect(() => {
    if (open) {
      if (transactionToEdit) {
        form.reset({
          type: transactionToEdit.type,
          coinId: transactionToEdit.coinId,
          symbol: transactionToEdit.symbol,
          name: transactionToEdit.name,
          image: transactionToEdit.image,
          quantity: transactionToEdit.quantity,
          pricePerCoin: transactionToEdit.pricePerCoin,
          date: new Date(transactionToEdit.date),
          note: transactionToEdit.note || "",
        });
      } else {
        form.reset({
          type: "buy",
          coinId: "",
          symbol: "",
          name: "",
          image: "",
          quantity: 0,
          pricePerCoin: 0,
          date: new Date(),
          note: "",
        });
      }
    }
  }, [open, transactionToEdit, form]);

  const onSubmit = (data: FormValues) => {
    const payload = {
      ...data,
      date: data.date.toISOString(),
    };

    if (transactionToEdit) {
      editTransaction(transactionToEdit.id, payload);
    } else {
      addTransaction(payload);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {transactionToEdit ? "Edit Transaction" : "Add Transaction"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <div className="flex rounded-lg overflow-hidden border border-input p-1 bg-muted/50">
                    <button
                      type="button"
                      className={cn(
                        "flex-1 py-1.5 text-sm font-medium rounded-md transition-all",
                        field.value === "buy"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      onClick={() => field.onChange("buy")}
                    >
                      Buy
                    </button>
                    <button
                      type="button"
                      className={cn(
                        "flex-1 py-1.5 text-sm font-medium rounded-md transition-all",
                        field.value === "sell"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      onClick={() => field.onChange("sell")}
                    >
                      Sell
                    </button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="coinId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Asset</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                          disabled={!!transactionToEdit} // Don't allow changing asset on edit
                        >
                          {field.value ? (
                            <div className="flex items-center gap-2">
                              {form.getValues("image") && (
                                <img
                                  src={form.getValues("image")}
                                  alt=""
                                  className="w-4 h-4 rounded-full"
                                />
                              )}
                              <span>{form.getValues("name")}</span>
                              <span className="text-muted-foreground text-xs uppercase">
                                {form.getValues("symbol")}
                              </span>
                            </div>
                          ) : (
                            "Search asset..."
                          )}
                          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Search coins (e.g. Bitcoin, ETH)..."
                          value={searchQuery}
                          onValueChange={setSearchQuery}
                        />
                        <CommandList>
                          <CommandEmpty>
                            {isSearching ? (
                              <div className="flex items-center justify-center p-4 text-muted-foreground text-sm gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Searching...
                              </div>
                            ) : (
                              "No assets found."
                            )}
                          </CommandEmpty>
                          <CommandGroup>
                            {searchResults?.coins?.map((coin) => (
                              <CommandItem
                                key={coin.id}
                                value={coin.id}
                                onSelect={() => {
                                  form.setValue("coinId", coin.id);
                                  form.setValue("symbol", coin.symbol);
                                  form.setValue("name", coin.name);
                                  form.setValue("image", coin.thumb);
                                  // trigger re-validation or price fetch
                                }}
                              >
                                <div className="flex items-center gap-2 flex-1">
                                  <img src={coin.thumb} alt="" className="w-5 h-5 rounded-full" />
                                  <span>{coin.name}</span>
                                  <span className="text-muted-foreground text-xs uppercase">
                                    {coin.symbol}
                                  </span>
                                </div>
                                {field.value === coin.id && (
                                  <Check className="h-4 w-4 ml-auto" />
                                )}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder="0.00"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pricePerCoin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price per coin (USD)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder="0.00"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="E.g., DCA deposit" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full">
              {transactionToEdit ? "Update Transaction" : "Add Transaction"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
