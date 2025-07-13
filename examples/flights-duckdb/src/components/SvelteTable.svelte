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

    // Function to clean and convert a string to a number
    const cleanAndConvert = (val: any) => {
      if (typeof val === 'string') {
        // Remove commas and dollar signs, then try to convert to number
        const cleanedVal = val.replace(/[$,]/g, ''); // Modified to remove '$' as well
        return isNaN(Number(cleanedVal)) ? val : Number(cleanedVal);
      }
      return val;
    };

    const cleanedAValue = cleanAndConvert(aValue);
    const cleanedBValue = cleanAndConvert(bValue);

    // Check if both cleaned values are numbers
    const isCleanedANumber = typeof cleanedAValue === 'number';
    const isCleanedBNumber = typeof cleanedBValue === 'number';

    if (isCleanedANumber && isCleanedBNumber) {
      // If both are numbers (after cleaning/conversion), compare them numerically
      return sortDirection === 'asc' ? cleanedAValue - cleanedBValue : cleanedBValue - cleanedAValue;
    } else if (typeof aValue === 'string' && typeof bValue === 'string') {
      // If both are general strings (or couldn't be converted to numbers), use localeCompare
      return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    }

    // Fallback for other types (original numbers, booleans, etc.)
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

  // A reactive variable to hold the rows that will actually be rendered, limited to 100
  $: displayedRows = sortedRows.slice(0, 100);

</script>

<style>
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 20px;
    font-size: 0.9em;
    font-family: 'Inter', sans-serif; /* Added Inter font */
  }
  th, td {
    border: 1px solid #ddd;
    padding: 8px;
    text-align: left;
    border-radius: 4px; /* Rounded corners */
  }
  th {
    background-color: #f2f2f2;
    cursor: pointer;
    border-radius: 4px; /* Rounded corners */
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
  /* Added some basic responsive styling */
  @media (max-width: 600px) {
    table, thead, tbody, th, td, tr {
      display: block;
    }
    thead tr {
      position: absolute;
      top: -9999px;
      left: -9999px;
    }
    tr {
      border: 1px solid #ccc;
      margin-bottom: 10px;
      border-radius: 8px;
    }
    td {
      border: none;
      border-bottom: 1px solid #eee;
      position: relative;
      padding-left: 50%;
      text-align: right;
      border-radius: 0; /* No rounded corners for individual cells on mobile */
    }
    td:before {
      /* Use the data-label attribute for content */
      content: attr(data-label);
      position: absolute;
      top: 6px;
      left: 6px;
      width: 45%;
      padding-right: 10px;
      white-space: nowrap;
      text-align: left;
      font-weight: bold;
    }
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
      {#each displayedRows as row (row.id || JSON.stringify(row))}
        <tr>
          {#each columns as column (column.key)}
            <!-- Added data-label attribute for responsive cell labeling -->
            <td data-label={column.title}>{column.value(row)}</td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
  {#if rows.length > 100}
    <p>Showing 100 of {rows.length} entries. Apply more filters to narrow down results.</p>
  {/if}
{/if}
