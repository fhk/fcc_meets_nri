<!-- ./components/SvelteTable.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';

  /**
   * @typedef {Object} ColumnDefinition
   * @property {string} key - A unique key for the column.
   * @property {string} title - The display title for the column header.
   * @property {(value: any) => any} value - A function that takes a row object and returns the value to display for this column.
   * @property {boolean} [sortable=false] - Whether the column is sortable.
   */

  /**
   * @type {ColumnDefinition[]}
   */
  export let columns: Array<{
    key: string;
    title: string;
    value: (row: any) => any;
    sortable?: boolean;
  }> = [];

  /**
   * @type {Record<string, any>[]}
   */
  export let rows: Record<string, any>[] = [];

  // Internal state for sorting
  let sortedRows: Record<string, any>[] = [];
  let currentSortColumn: string | null = null;
  let sortDirection: 'asc' | 'desc' = 'asc'; // 'asc' or 'desc'

  // Function to apply sorting to the rows
  function applySorting() {
    if (!currentSortColumn || !rows) {
      sortedRows = Array.from(rows); // If no sort column or no rows, just use a copy
      return;
    }

    const columnDef = columns.find(col => col.key === currentSortColumn);
    if (!columnDef || !columnDef.sortable) {
      sortedRows = Array.from(rows); // If column not found or not sortable, no sorting
      return;
    }

    // Create a shallow copy to sort without mutating the original `rows` prop
    sortedRows = Array.from(rows).sort((a, b) => {
      const valA = a[currentSortColumn!];
      const valB = b[currentSortColumn!];

      // Handle null/undefined values: push them to the end
      if (valA === null || valA === undefined) return sortDirection === 'asc' ? 1 : -1;
      if (valB === null || valB === undefined) return sortDirection === 'asc' ? -1 : 1;

      // Numeric comparison
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }
      // String comparison
      else if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      // Fallback for mixed types or other types (treat as strings)
      else {
        const strA = String(valA);
        const strB = String(valB);
        return sortDirection === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
      }
    });
  }

  // Handle column header click for sorting
  function handleSort(columnKey: string) {
    if (currentSortColumn === columnKey) {
      // If same column, toggle direction
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // If new column, set to ascending
      currentSortColumn = columnKey;
      sortDirection = 'asc';
    }
    applySorting(); // Re-apply sorting with new state
  }

  // Reactive statement: whenever `rows` prop changes, re-apply sorting
  $: if (rows) {
    applySorting();
  }

  // Initial sort on mount (if a default sort column is set, or just to process initial rows)
  onMount(() => {
    applySorting();
  });
</script>

<div class="table-container">
  {#if sortedRows.length > 0}
    <table>
      <thead>
        <tr>
          {#each columns as column (column.key)}
            <th
              class:sortable={column.sortable}
              class:sort-asc={currentSortColumn === column.key && sortDirection === 'asc'}
              class:sort-desc={currentSortColumn === column.key && sortDirection === 'desc'}
              on:click={() => column.sortable && handleSort(column.key)}
            >
              {column.title}
              {#if currentSortColumn === column.key}
                <span class="sort-icon">
                  {sortDirection === 'asc' ? '▲' : '▼'}
                </span>
              {/if}
            </th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each sortedRows as row (row.id || JSON.stringify(row))}
          <tr>
            {#each columns as column (column.key)}
              <td>{column.value(row)}</td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  {:else}
    <p>No data to display.</p>
  {/if}
</div>

<style>
  .table-container {
    overflow-x: auto; /* Allows horizontal scrolling on small screens */
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9em;
    min-width: 600px; /* Ensures table doesn't get too squished */
  }

  th,
  td {
    padding: 12px 15px;
    text-align: left;
    border-bottom: 1px solid #e0e0e0;
  }

  th {
    background-color: #f8f8f8;
    font-weight: bold;
    color: #333;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    position: relative; /* Needed for absolute positioning of sort icon */
  }

  th.sortable {
    cursor: pointer; /* Indicate sortable columns */
  }

  th.sortable:hover {
    background-color: #e8e8e8;
  }

  /* Sort icons */
  .sort-icon {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 0.8em;
    color: #666;
  }

  tbody tr:nth-child(even) {
    background-color: #fdfdfd;
  }

  tbody tr:hover {
    background-color: #f0f0f0;
    cursor: pointer;
  }

  /* Style for the last row's bottom border */
  tbody tr:last-child td {
    border-bottom: none;
  }

  p {
    text-align: center;
    padding: 20px;
    color: #666;
  }
</style>
