<template>
  <q-page>
    <router-link to="/prospects" class="text-back">
      <q-icon name="arrow_back" size="16px" />
      Prospects
    </router-link>

    <div class="page-heading q-mb-md">
      <div>
        <div class="eyebrow">New list</div>
        <div class="text-h5">Create a list</div>
        <div class="text-caption text-grey">Choose how you want to bring in prospects.</div>
      </div>
    </div>

    <div class="channel-overview">
      <article>
        <button class="channel-summary" @click="onImportCsv">
          <span class="channel-symbol">
            <q-icon name="upload_file" size="23px" />
          </span>
          <span>
            <strong>Import a CSV</strong>
            <small>Upload a spreadsheet of contacts you already have.</small>
          </span>
        </button>
      </article>

      <article>
        <router-link to="/prospects/new/scraping" class="channel-summary">
          <span class="channel-symbol">
            <q-icon name="travel_explore" size="23px" />
          </span>
          <span>
            <strong>One-off scraping</strong>
            <small>Run a single search for prospects matching specific criteria.</small>
          </span>
        </router-link>
      </article>
    </div>
  </q-page>
</template>

<script>
import { defineComponent } from "vue";
import { Notify } from "quasar";

export default defineComponent({
  name: "NewProspectListPage",
  setup() {
    function onImportCsv() {
      Notify.create({
        type: "info",
        message: "CSV import is coming soon.",
      });
    }

    return { onImportCsv };
  },
});
</script>

<style scoped>
.text-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--heyfred-muted);
  font-size: 13px;
  text-decoration: none;
  margin-bottom: 18px;
}
.text-back:hover {
  color: var(--heyfred-ink);
}
.eyebrow {
  color: var(--heyfred-muted);
  font-size: 11px;
  letter-spacing: 1.2px;
  text-transform: uppercase;
}
.channel-overview {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
.channel-overview > article {
  background: #fff;
  border: 1px solid var(--heyfred-border);
  border-radius: 8px;
  overflow: hidden;
}
.channel-summary {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 15px;
  padding: 22px;
  text-align: left;
  background: none;
  border: none;
  font: inherit;
  color: inherit;
  text-decoration: none;
}
.channel-summary:hover {
  background: var(--heyfred-cream);
}
.channel-symbol {
  display: grid;
  place-items: center;
  width: 45px;
  height: 45px;
  border: 1px solid var(--heyfred-border);
  background: var(--heyfred-cream);
  border-radius: 8px;
  flex-shrink: 0;
  color: var(--heyfred-orange);
}
.channel-summary strong {
  display: block;
  font-size: 15px;
  font-weight: 600;
}
.channel-summary small {
  display: block;
  color: var(--heyfred-muted);
  font-size: 12px;
  margin-top: 4px;
  line-height: 1.5;
}

@media (max-width: 767px) {
  .channel-overview {
    grid-template-columns: 1fr;
  }
}
</style>
