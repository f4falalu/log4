import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  getFilteredRowModel,
  ColumnFiltersState,
} from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, Search, Filter, Download, RefreshCw, ArrowUpDown } from "lucide-react";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  title?: string;
  description?: string;
  searchKey?: string;
  onRefresh?: () => void;
  onExport?: () => void;
  isLoading?: boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  title,
  description,
  searchKey = "name",
  onRefresh,
  onExport,
  isLoading = false,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
  });

  return (
    <Card className="border-2 shadow-lg">
      <CardHeader className="border-b border-border bg-secondary/20">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            {title && (
              <CardTitle className="text-xl flex items-center gap-2">
                {title}
                <Badge variant="outline" className="text-xs">
                  {data.length} items
                </Badge>
              </CardTitle>
            )}
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
                className="hover:border-foreground"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            )}
            {onExport && (
              <Button
                variant="outline"
                size="sm"
                onClick={onExport}
                className="hover:border-foreground"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Search and Filters */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/30">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={globalFilter ?? ""}
                onChange={(event) => setGlobalFilter(String(event.target.value))}
                className="pl-10 w-64"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setColumnFilters([])}>
                  Clear all filters
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="text-operational text-sm text-muted-foreground">
            Showing {table.getFilteredRowModel().rows.length} of {data.length} results
          </div>
        </div>

        {/* Table */}
        <div className="relative">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="bg-secondary/10">
                      {header.isPlaceholder ? null : (
                        <div
                          className={`flex items-center gap-2 ${
                            header.column.getCanSort() ? 'cursor-pointer hover:text-foreground' : ''
                          }`}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() && (
                            <ArrowUpDown className="h-3 w-3 opacity-50" />
                          )}
                        </div>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="hover:bg-secondary/50 transition-colors duration-200"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                        <Search className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        No results found
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Try adjusting your search or filter criteria
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between p-4 border-t border-border bg-secondary/10">
          <div className="text-sm text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
