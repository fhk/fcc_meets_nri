<script lang="ts">
  import { FalconVis, DuckDB } from "falcon-vis";
  import type { View0D, View1D, View0DState, View1DState } from "falcon-vis";
  import GithubButton from "./components/GithubButton.svelte";
  import { tableFromIPC } from "apache-arrow";

  import { onMount } from "svelte";
  import Histogram from "./components/Histogram.svelte";
  import TotalCount from "./components/TotalCount.svelte";
  import UsMapVis from "./components/USMapVis.svelte";
  import SvelteTable from "./components/SvelteTable.svelte"; // Assuming you have this component for the table

  let falcon: FalconVis;
  let countView: View0D;
  let distanceView: View1D;
  let arrDelayView: View1D;
  let depDelayView: View1D;
  let flightDateView: View1D;
  let originView: View1D;
  let countState: View0DState;
  let distanceState: View1DState;
  let arrDelayState: View1DState;
  let depDelayState: View1DState;
  let flightDateState: View1DState;
  let originState: View1DState;

  // Reactive variable to hold the ID filter input value for the sample data table
  let idFilterValue: string = "";
  // Reactive variable to hold the selected operator for the ID filter (e.g., '<=' or '>=')
  let idFilterOperator: "<=" | ">=" = "<="; // Default to less than or equal

  // Reactive variable for the 'total_bsl' filter input for the FalconVis entries table
  let totalBslFilterValue: string = "";
  // Reactive variable to hold the selected operator for the Total BSL filter
  let totalBslFilterOperator: "<=" | ">=" = "<="; // Default to less than or equal

  // Reactive variable for the 'city' filter input
  let cityInput: string = ""; // Changed from cityFilterValue to cityInput for the current input
  // Reactive variable to hold the list of applied city filters
  let cityFilters: string[] = [];

  // Reactive variable to track if a filter is currently applied
  let isFilterApplied: boolean = false;

  // --- Data and Columns for the FalconVis `entries` table ---
  let page = 0;
  let numEntries = 25;
  let entries: Record<string, any>[] = []; // Initialize as an empty array, will be populated by FalconVis

  // Reactive variable that will hold the filtered entries
  let filteredEntries: Record<string, any>[] = [];

  // Reactive variables for column totals
  let totalExpectedAnnualLoss: number = 0;
  let totalTotalBsl: number = 0;
  let totalServedBsls: number = 0;

  // Reactive variable to hold the filter configuration for FalconVis
  let falconFilterConfig: any = {}; // This will be passed to falcon.filter()

  // Function to add a city to the filters list
  function addCityFilter() {
    const city = cityInput.trim();
    if (city && !cityFilters.includes(city)) {
      cityFilters = [...cityFilters, city]; // Add to array and trigger reactivity
      cityInput = ""; // Clear the input field
    }
  }

  // Function to remove a city from the filters list
  function removeCityFilter(cityToRemove: string) {
    cityFilters = cityFilters.filter((city) => city !== cityToRemove); // Filter out the city and trigger reactivity
  }

  // Reactive statement: When totalBslFilterValue OR totalBslFilterOperator changes, update falconFilterConfig
  $: {
    const threshold = Number(totalBslFilterValue);
    if (totalBslFilterValue === null || totalBslFilterValue === "" || isNaN(threshold)) {
      const { total_bsl, ...rest } = falconFilterConfig;
      falconFilterConfig = { ...rest };
    } else {
      falconFilterConfig = {
        ...falconFilterConfig,
        total_bsl: {
          [totalBslFilterOperator === "<=" ? "max" : "min"]: threshold,
        },
      };
    }
    // Re-evaluate isFilterApplied based on all active filters
    isFilterApplied = Object.keys(falconFilterConfig).length > 0 || cityFilters.length > 0;
  }

  // Reactive statement: When cityFilters changes, update falconFilterConfig
  $: {
    if (cityFilters.length === 0) {
      const { city, ...rest } = falconFilterConfig;
      falconFilterConfig = { ...rest };
    } else {
      // Use the 'in' operator for FalconVis to filter by multiple exact city names
      falconFilterConfig = {
        ...falconFilterConfig,
        city: {
          in: cityFilters,
        },
      };
    }
    // Re-evaluate isFilterApplied based on all active filters
    isFilterApplied = Object.keys(falconFilterConfig).length > 0 || cityFilters.length > 0;
  }

  // Reactive statement to apply the filter to FalconVis whenever falconFilterConfig changes
  $: if (falcon && typeof falcon.filter === "function") {
    if (Object.keys(falconFilterConfig).length > 0) {
      falcon.filter(falconFilterConfig);
    } else {
      // If no filters are active, clear all FalconVis filters
      falcon.filter(null);
    }
  }

  // Reactive statement for client-side filtering entries by 'total_bsl' and 'city'
  $: {
    let tempFilteredEntries = Array.from(entries);

    // Apply total_bsl filter
    const threshold = Number(totalBslFilterValue);
    if (totalBslFilterValue !== null && totalBslFilterValue !== "" && !isNaN(threshold)) {
      tempFilteredEntries = tempFilteredEntries.filter((entry) => {
        if (totalBslFilterOperator === "<=") {
          return entry.total_bsl <= threshold;
        } else {
          return entry.total_bsl >= threshold;
        }
      });
    }

    // Apply client-side city filtering based on cityFilters array
    if (cityFilters.length > 0) {
      tempFilteredEntries = tempFilteredEntries.filter((entry) => {
        const entryCityLower = entry.city.toLowerCase();
        // Check if the entry's city is included in the list of filtered cities (case-insensitive)
        return cityFilters.some((filterCity) =>
          entryCityLower.includes(filterCity.toLowerCase())
        );
      });
    }
    filteredEntries = tempFilteredEntries;
  }

  // Reactive statement to calculate totals whenever filteredEntries changes
  $: {
    totalExpectedAnnualLoss = filteredEntries.reduce(
      (sum, entry) => sum + (entry.expected_annual_loss || 0),
      0
    );
    totalTotalBsl = filteredEntries.reduce(
      (sum, entry) => sum + (entry.total_bsl || 0),
      0
    );
    totalServedBsls = filteredEntries.reduce(
      (sum, entry) => sum + (entry.served_bsl || 0),
      0
    );
  }

  // Columns for the FalconVis `entries` table
  let entriesColumns = [
     {
      key: "city",
      title: "City",
      value: (v) => v.city,
      sortable: true,
    },
    {
      key: "state",
      title: "State",
      value: (v) => v.state,
      sortable: true,
    },
    {
      key: "expected_annual_loss",
      title: "Expected Annual Loss ($)",
      value: (v) =>
        v.expected_annual_loss.toLocaleString("en-US", {
          style: "currency",
          currency: "USD",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }),
      sortable: true,
    },
    {
      key: "total_bsl",
      title: "Total BSL",
      value: (v) => v.total_bsl.toLocaleString(),
      sortable: true,
    },
    {
      key: "served_bsl",
      title: "Served BSLs",
      value: (v) => v.served_bsl.toLocaleString(),
      sortable: true,
    },
  ];

  onMount(async () => {
    const db = await DuckDB.fromParquetFile("city.parquet");
    falcon = new FalconVis(db);

    countView = await falcon.view0D((updated) => {
      countState = updated;
    });

    distanceView = await falcon.view1D({
      type: "continuous",
      name: "total_bsl",
      resolution: 100,
      bins: 100,
    });
    distanceView.onChange((updated) => {
      distanceState = updated;
    });

    arrDelayView = await falcon.view1D({
      type: "continuous",
      name: "expected_annual_loss",
      resolution: 400,
      range: [0, 50000000],
      bins: 20,
    });
    arrDelayView.onChange((updated) => {
      arrDelayState = updated;
    });

    depDelayView = await falcon.view1D({
      type: "continuous",
      name: "served_bsl",
      resolution: 400,
      range: [10000, 100000],
      bins: 20,
    });
    depDelayView.onChange((updated) => {
      depDelayState = updated;
    });

    originView = await falcon.view1D({
      type: "categorical",
      name: "state",
    });
    originView.onChange((updated) => {
      originState = updated;
    });

    await falcon.link();

    // Initial load of entries for the SvelteTable
    await fetchEntries();
  });

  let resolved = true;

  // Function to fetch and update entries
  async function fetchEntries() {
    if (falcon && resolved) {
      resolved = false;
      try {
        // Falcon.entries() will now return data already filtered by falconFilterConfig
        entries = Array.from(
          await falcon.entries({
            length: numEntries,
            offset: page,
          })
        );
      } catch (error) {
        console.error("Error fetching entries:", error);
        entries = []; // Reset entries on error
      } finally {
        resolved = true;
      }
    }
  }

  // Function to reset the filter
  async function resetFilter() {
    totalBslFilterValue = ''; // Clear the input value
    totalBslFilterOperator = '<='; // Reset operator to default
    cityInput = ''; // Clear the city input field
    cityFilters = []; // Clear the city filters array
    // The reactive block for falconFilterConfig will handle clearing the FalconVis filter
    // and setting isFilterApplied to false
    await fetchEntries(); // Re-fetch entries to show unfiltered data
  }

  // Reactive statement to re-fetch entries when relevant states change
  $: if (originState || arrDelayState || depDelayState || flightDateState) {
    fetchEntries();
  }
</script>

<svelte:head>
  <title>FCC meets NRI</title>
</svelte:head>

<header>
  <div>
    <h1>FCC meets NRI</h1>
  </div>
</header>

<main>
  <div id="vis">
    <div id="charts">
      <div id="hists">
        {#if falcon && distanceState}
          <Histogram
            title="Total BSL"
            dimLabel="Count of broadband service locations"
            bins={distanceState.bin}
            filteredCounts={distanceState.filter}
            totalCounts={distanceState.total}
            on:mouseenter={async () => {
              await distanceView.activate();
            }}
            on:select={async (e) => {
              const selection = e.detail;
              if (selection !== null) {
                await distanceView.select(selection);
              } else {
                await distanceView.select();
              }
            }}
          />
        {/if}

        {#if falcon && arrDelayState}
          <Histogram
            title="Expected Annual Loss"
            dimLabel="The state level predicted annual loss ($)"
            bins={arrDelayState.bin}
            filteredCounts={arrDelayState.filter}
            totalCounts={arrDelayState.total}
            on:mouseenter={async () => {
              await arrDelayView.activate();
            }}
            on:select={async (e) => {
              const selection = e.detail;
              if (selection !== null) {
                await arrDelayView.select(selection);
              } else {
                await arrDelayView.select();
              }
            }}
          />
        {/if}

        {#if falcon && depDelayState}
          <Histogram
            title="Total Served BSLs"
            dimLabel="The reported number of locations served"
            bins={depDelayState.bin}
            filteredCounts={depDelayState.filter}
            totalCounts={depDelayState.total}
            on:mouseenter={async () => {
              await depDelayView.activate();
            }}
            on:select={async (e) => {
              const selection = e.detail;
              if (selection !== null) {
                await depDelayView.select(selection);
              } else {
                await depDelayView.select();
              }
            }}
          />
        {/if}

        {#if falcon && flightDateState}
          <Histogram
            timeUnit=""
            type="temporal"
            title="Flight Date"
            dimLabel="Time of flight"
            bins={flightDateState.bin}
            filteredCounts={flightDateState.filter}
            totalCounts={flightDateState.total}
            on:mouseenter={async () => {
              await flightDateView.activate();
            }}
            on:select={async (e) => {
              const selection = e.detail;
              if (selection !== null) {
                await flightDateView.select(selection);
              } else {
                await flightDateView.select();
              }
            }}
          />
        {/if}
      </div>

      <div id="maps">
        {#if falcon && originState}
          <UsMapVis
            width={700}
            title="Select State/s"
            state={originState}
            on:mouseenter={async () => {
              await originView.activate();
            }}
            on:select={async (e) => {
              const selection = e.detail;
              if (selection !== null) {
                await originView.select(selection);
              } else {
                await originView.select();
              }
            }}
          />
        {/if}
      </div>
    </div>
  </div>
  <TotalCount
         filteredCount={countState?.filter ?? 0}
         totalCount={countState?.total ?? 0}
         width={800}
         height={20}
       />

  <div class="table-section">
    <h2>City Data Table</h2>
    <div class="filter-controls">
      <div class="filter-input-container">
        <label for="cityInput">Add City Filter:</label>
        <input
          id="cityInput"
          type="text"
          placeholder="e.g., San Jose"
          bind:value={cityInput}
          on:keydown={(e) => {
            if (e.key === 'Enter') {
              addCityFilter();
            }
          }}
        />
        <button on:click={addCityFilter}>Add City</button>
      </div>
      <div class="filter-input-container">
        <label for="totalBslFilterOperator">Total BSL Is:</label>
        <select id="totalBslFilterOperator" bind:value={totalBslFilterOperator}>
          <option value="<=">&lt;= (Less Than or Equal)</option>
          <option value=">=">&gt;= (Greater Than or Equal)</option>
        </select>
        <label for="totalBslFilterInput">Value:</label>
        <input
          id="totalBslFilterInput"
          type="number"
          placeholder="e.g., 50000"
          bind:value={totalBslFilterValue}
        />
      </div>

      {#if cityFilters.length > 0}
        <div class="applied-city-filters">
          <label>Applied Cities:</label>
          {#each cityFilters as city}
            <span class="city-tag">
              {city}
              <button on:click={() => removeCityFilter(city)}>x</button>
            </span>
          {/each}
        </div>
      {/if}
       {#if isFilterApplied}
         <button class="reset-button" on:click={resetFilter}>Reset Filter</button>
       {/if}
     </div>
     <div class="totals-container">
       <div>
         <strong>Total Expected Annual Loss:</strong>
         {totalExpectedAnnualLoss.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
       </div>
       <div>
         <strong>Total BSL:</strong> {totalTotalBsl.toLocaleString()}
       </div>
       <div>
         <strong>Total Served BSLs:</strong> {totalServedBsls.toLocaleString()}
       </div>
     </div>
     <div>
     </div>
     {#if entries}
       <div class="pagination-buttons">
         <button
           on:click={async () => {
             page = Math.max(page - numEntries, 0);
             await fetchEntries(); // Call the helper function
           }}>back</button
         >
         <button
           on:click={async () => {
             page += numEntries;
             await fetchEntries(); // Call the helper function
           }}>next</button
         >
       </div>
       <SvelteTable columns="{entriesColumns}" rows="{filteredEntries}" />
     {/if}
   </div>
 </main>


<style>
  :global(:root) {
    --bg-color: white;
    --text-color: rgb(53, 53, 53);
    --primary-color: var(--text-color);
  }
  :global(body, html) {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
      Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
    margin: 0;
    background-color: var(--bg-color);
    color: var(--text-color);
    /* padding: 5px; */
  }
  main {
    padding: 15px;
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: rgb(250, 250, 250);
    border-radius: 5px;
    box-shadow: 0px 0px 3px 1px rgba(0, 0, 0, 0.115);
    margin: 10px;
    margin-bottom: 5px;
    padding: 15px;
    padding-right: 25px;
  }

  .table-section {
    /* General container for each SvelteTable */
    border: 1px solid lightgrey;
    margin-top: 20px;
    padding: 20px;
    border-radius: 10px;
  }

  #vis {
    width: 100%;
    height: 500px;
  }

  #charts {
    display: flex;
    gap: 20px;
  }
  #maps {
    /* padding: 20px; */
  }
  #hists {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .filter-controls {
    display: flex;
    align-items: center;
    gap: 15px; /* Space between filter inputs and button */
    margin-bottom: 15px;
    flex-wrap: wrap; /* Allow filters to wrap on smaller screens */
  }

  .filter-input-container {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .filter-input-container label {
    font-weight: bold;
    white-space: nowrap; /* Prevent label from wrapping */
  }

  .filter-input-container select,
  .filter-input-container input,
  .filter-input-container button {
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 1rem;
  }

  .filter-input-container select {
    width: auto; /* Allow select to size naturally */
    min-width: 120px; /* Give it a minimum width */
  }

  .filter-input-container input {
    width: 150px; /* Adjust as needed for input */
  }

  .reset-button {
    padding: 8px 15px;
    background-color: #f44336; /* Red color for reset */
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
    transition: background-color 0.2s ease;
  }

  .reset-button:hover {
    background-color: #d32f2f;
  }

  .pagination-buttons {
    margin-top: 10px;
    margin-bottom: 10px;
    display: flex;
    gap: 10px;
  }

  .totals-container {
    margin-top: 15px;
    margin-bottom: 15px;
    padding: 10px;
    border: 1px solid #eee;
    border-radius: 5px;
    background-color: #f9f9f9;
    display: flex;
    justify-content: space-around;
    flex-wrap: wrap;
    gap: 10px;
  }

  .totals-container div {
    font-size: 1.1em;
    padding: 5px;
  }

  .applied-city-filters {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 5px;
  }

  .city-tag {
    background-color: #e0e0e0;
    padding: 5px 10px;
    border-radius: 15px;
    display: flex;
    align-items: center;
    font-size: 0.9em;
  }

  .city-tag button {
    background: none;
    border: none;
    color: #757575;
    font-weight: bold;
    margin-left: 5px;
    cursor: pointer;
    font-size: 0.9em;
  }

  .city-tag button:hover {
    color: #424242;
  }
</style>