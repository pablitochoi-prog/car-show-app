export type AdminSortDir = "asc" | "desc";

export type AdminTableFilterType = "text" | "enum" | "dateFrom" | "dateTo";

export type AdminTableColumnConfig = {
  id: string;
  sortable?: boolean;
  filterable?: boolean;
  filterType?: AdminTableFilterType;
  /** Allowed values when filterType is enum */
  enumValues?: readonly string[];
};

export type AdminTableConfig = {
  prefix: string;
  defaultSort: string;
  defaultSortDir: AdminSortDir;
  defaultPageSize: number;
  maxPageSize: number;
  columns: AdminTableColumnConfig[];
};

export type ParsedAdminTableParams = {
  sort: string;
  sortDir: AdminSortDir;
  page: number;
  pageSize: number;
  q: string;
  filters: Record<string, string>;
};

export type AdminTableMeta = {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
