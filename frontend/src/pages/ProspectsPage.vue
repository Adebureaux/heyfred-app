<template>
  <q-page>
    <div class="page-heading q-mb-md">
      <div class="row items-center justify-between">
        <div>
          <div class="eyebrow">Prospects</div>
          <div class="text-h5">Prospects</div>
          <div class="text-caption text-grey">Contacts you've collected across your lists.</div>
        </div>
        <q-btn color="primary" icon="add" label="Create a list" to="/prospects/new" />
      </div>
    </div>

    <q-spinner v-if="loading" color="primary" size="2em" />

    <q-banner v-else-if="lists.length === 0" class="heyfred-banner">
      <template #avatar>
        <q-icon name="groups" color="primary" size="28px" />
      </template>
      No prospects yet. Create a list to start finding contacts.
      <template #action>
        <q-btn flat color="primary" label="Create a list" to="/prospects/new" />
      </template>
    </q-banner>

    <q-list v-else bordered separator>
      <q-item v-for="list in lists" :key="list.id" clickable :to="`/prospects/${list.id}`">
        <q-item-section>
          <q-item-label>{{ list.name }}</q-item-label>
          <q-item-label caption>
            {{ list.targetIndustries.join(", ") }} · {{ list.targetLocations.join(", ") }}
          </q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-chip :color="statusColor(list.status)" text-color="white" dense>
            {{ statusLabel(list.status) }}
          </q-chip>
        </q-item-section>
      </q-item>
    </q-list>
  </q-page>
</template>

<script>
import { defineComponent, ref, onMounted } from "vue";
import { api } from "boot/axios";
import { Notify } from "quasar";
import { extractErrorMessage } from "src/utils/error-message";

const STATUS_LABELS = {
  DRAFT: "Draft",
  BRIEF_SET: "Ready to run",
  SCRAPING: "Finding companies",
  ENRICHING: "Finding decision-makers",
  READY: "Ready",
  FAILED: "Failed",
};

const STATUS_COLORS = {
  DRAFT: "grey",
  BRIEF_SET: "grey",
  SCRAPING: "primary",
  ENRICHING: "primary",
  READY: "positive",
  FAILED: "negative",
};

export default defineComponent({
  name: "ProspectsPage",
  setup() {
    const lists = ref([]);
    const loading = ref(true);

    onMounted(async () => {
      try {
        const { data } = await api.get("/prospect-lists");
        lists.value = data;
      } catch (err) {
        Notify.create({
          type: "negative",
          message: extractErrorMessage(err, "Unable to load prospect lists"),
        });
      } finally {
        loading.value = false;
      }
    });

    function statusLabel(status) {
      return STATUS_LABELS[status] ?? status;
    }
    function statusColor(status) {
      return STATUS_COLORS[status] ?? "grey";
    }

    return { lists, loading, statusLabel, statusColor };
  },
});
</script>

<style scoped>
.eyebrow {
  color: var(--heyfred-muted);
  font-size: 11px;
  letter-spacing: 1.2px;
  text-transform: uppercase;
}
.heyfred-banner {
  background: var(--heyfred-peach);
  border: 1px solid var(--heyfred-border);
  border-radius: 15px;
}
</style>
