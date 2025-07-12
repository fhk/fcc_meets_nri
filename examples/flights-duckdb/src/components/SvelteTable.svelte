<script lang="ts">
  export let columns: { key: string; title: string; value: (row: any) => any; sortable?: boolean }[] = [];
  export let rows: Record<string, any>[] = [];

  // Local state for sorting
  let sortColumn: string | null = null;
  let sortDirection: 'asc' | 'desc' = 'asc';

  $: sortedRows = [...rows].sort((a, b) => {
    if (!sortColumn) return 0;

    const columnDef = columns.find(col => col.key === sortColumn);
    if (!columnDef || !columnDef.sortable) return 0;

    const aValue = columnDef.value(a);
    const bValue = columnDef.value(b);

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    }
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  function handleSort(key: string) {
    if (sortColumn === key) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      sortColumn = key;
      sortDirection = 'asc';
    }
  }

  // --- THIS IS THE KEY CHANGE ---
  // A reactive variable to hold the rows that will actually be rendered, limited to 100
  $: displayedRows = sortedRows.slice(0, 100);
  // --- END OF KEY CHANGE ---

</script>

<style>
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 20px;
    font-size: 0.9em;
  }
  th, td {
    border: 1px solid #ddd;
    padding: 8px;
    text-align: left;
  }
  th {
    background-color: #f2f2f2;
    cursor: pointer;
  }
  th:hover {
    background-color: #e0e0e0;
  }
  th.sortable {
    position: relative;
  }
  th.sortable span {
    margin-left: 5px;
  }
</style>

{#if rows.length === 0}
  <p>No data to display.</p>
{:else}
  <table>
    <thead>
      <tr>
        {#each columns as column (column.key)}
          <th
            class:sortable={column.sortable}
            on:click={() => column.sortable && handleSort(column.key)}
          >
            {column.title}
            {#if sortColumn === column.key}
              <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>
            {/if}
          </th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each displayedRows as row (row.id || JSON.stringify(row))} <tr>
          {#each columns as column (column.key)}
            <td>{column.value(row)}</td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
  {#if rows.length > 100}
    <p>Showing 100 of {rows.length} entries. Apply more filters to narrow down results.</p>
  {/if}
{/if}
