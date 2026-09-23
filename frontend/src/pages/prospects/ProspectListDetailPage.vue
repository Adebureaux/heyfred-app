<template>
  <q-page>
    <q-spinner v-if="loading" color="primary" size="2em" />

    <template v-else-if="list">
      <div class="row items-center justify-between q-mb-md">
        <div>
          <div class="text-h5">{{ list.name }}</div>
          <div class="text-caption text-grey">{{ list.offerDescription }}</div>
        </div>
        <q-chip :color="statusColor(list.status)" text-color="white">
          {{ statusLabel(list.status) }}
        </q-chip>
      </div>

      <q-card flat bordered class="q-mb-md">
        <q-card-section>
          <div class="text-subtitle2 q-mb-sm">Targeting</div>
          <div class="q-gutter-xs q-mb-sm">
            <q-chip v-for="title in list.targetJobTitles" :key="title" dense outline color="primary" text-color="primary">
              {{ title }}
            </q-chip>
          </div>
          <div class="text-body2 text-grey-8">
            {{ list.targetIndustries.join(", ") }} · {{ list.targetLocations.join(", ") }}
          </div>
        </q-card-section>
      </q-card>

      <q-card v-if="list.status === 'BRIEF_SET'" flat bordered class="q-mb-md">
        <q-card-section class="row items-center justify-between">
          <div>Ready to find companies and decision-makers matching this brief.</div>
          <q-btn color="primary" label="Find prospects" :loading="triggering" @click="onRun" />
        </q-card-section>
      </q-card>

      <q-banner v-if="!unipileConnected && list.status !== 'BRIEF_SET'" class="heyfred-banner q-mb-md">
        <template #avatar>
          <q-icon name="link_off" color="primary" size="24px" />
        </template>
        No LinkedIn account connected — decision-maker search will fail until you connect one.
        <template #action>
          <q-btn flat color="primary" label="Connect LinkedIn" to="/settings/linkedin" />
        </template>
      </q-banner>

      <q-card v-if="runs.length > 0" flat bordered class="q-mb-md">
        <q-card-section>
          <div class="text-subtitle2 q-mb-sm">Progress</div>
          <q-list dense>
            <q-item v-for="run in runs" :key="run.id">
              <q-item-section avatar>
                <q-icon
                  :name="run.stage === 'COMPANY_SEARCH' ? 'business' : 'person_search'"
                  :color="runStatusColor(run.status)"
                />
              </q-item-section>
              <q-item-section>
                {{ run.stage === "COMPANY_SEARCH" ? "Company search" : "Decision-maker search" }}
                <div v-if="run.status === 'SUCCEEDED'" class="text-caption text-grey">
                  {{ run.resultCount ?? 0 }} result{{ run.resultCount === 1 ? "" : "s" }}
                </div>
                <div v-if="run.selectedActorId" class="text-caption text-grey-7">
                  Source: {{ run.selectedActorId }}
                  <span v-if="run.selectionReasoning">— {{ run.selectionReasoning }}</span>
                </div>
                <div v-if="run.error" class="text-caption text-negative">{{ run.error }}</div>
              </q-item-section>
              <q-item-section side>
                <q-spinner v-if="run.status === 'RUNNING'" color="primary" size="1.2em" />
                <q-chip v-else dense :color="runStatusColor(run.status)" text-color="white">
                  {{ runStatusLabel(run.status) }}
                </q-chip>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
      </q-card>

      <q-banner v-if="list.status === 'READY' && prospects.length === 0" class="heyfred-banner">
        No prospects found for this brief. Try broadening your targeting.
      </q-banner>

      <q-card v-if="prospects.length > 0" flat bordered>
        <q-card-section>
          <div class="text-subtitle2 q-mb-sm">Prospects found ({{ prospects.length }})</div>
          <q-table :rows="prospects" :columns="prospectColumns" row-key="id" flat dense :pagination="{ rowsPerPage: 10 }">
            <template #body-cell-linkedinUrl="props">
              <q-td :props="props">
                <a v-if="props.value" :href="props.value" target="_blank" rel="noopener">Profile</a>
              </q-td>
            </template>
          </q-table>
        </q-card-section>
      </q-card>
    </template>
  </q-page>
</template>

<script>
import { defineComponent, ref, onMounted, onUnmounted } from "vue";
import { useRoute } from "vue-router";
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

const RUN_STATUS_LABELS = {
  QUEUED: "Queued",
  RUNNING: "Running",
  SUCCEEDED: "Succeeded",
  FAILED: "Failed",
};

const RUN_STATUS_COLORS = {
  QUEUED: "grey",
  RUNNING: "primary",
  SUCCEEDED: "positive",
  FAILED: "negative",
};

const PROSPECT_COLUMNS = [
  { name: "firstName", label: "First name", field: "firstName", align: "left" },
  { name: "lastName", label: "Last name", field: "lastName", align: "left" },
  { name: "jobTitle", label: "Title", field: "jobTitle", align: "left" },
  { name: "company", label: "Company", field: (row) => row.company?.name ?? "", align: "left" },
  { name: "email", label: "Email", field: "email", align: "left" },
  { name: "linkedinUrl", label: "LinkedIn", field: "linkedinUrl", align: "left" },
];

export default defineComponent({
  name: "ProspectListDetailPage",
  setup() {
    const route = useRoute();
    const listId = route.params.id;

    const list = ref(null);
    const runs = ref([]);
    const prospects = ref([]);
    const loading = ref(true);
    const triggering = ref(false);
    const unipileConnected = ref(true);
    let pollHandle = null;

    function statusLabel(status) {
      return STATUS_LABELS[status] ?? status;
    }
    function statusColor(status) {
      return STATUS_COLORS[status] ?? "grey";
    }
    function runStatusLabel(status) {
      return RUN_STATUS_LABELS[status] ?? status;
    }
    function runStatusColor(status) {
      return RUN_STATUS_COLORS[status] ?? "grey";
    }

    async function fetchList() {
      const { data } = await api.get(`/prospect-lists/${listId}`);
      list.value = data;
    }
    async function fetchRuns() {
      const { data } = await api.get(`/prospect-lists/${listId}/runs`);
      runs.value = data;
    }
    async function fetchProspects() {
      const { data } = await api.get(`/prospect-lists/${listId}/prospects`);
      prospects.value = data;
    }
    async function fetchUnipileStatus() {
      const { data } = await api.get("/unipile/status");
      unipileConnected.value = data.status === "CONNECTED";
    }

    function stopPolling() {
      if (pollHandle) {
        clearInterval(pollHandle);
        pollHandle = null;
      }
    }

    function startPolling() {
      stopPolling();
      pollHandle = setInterval(async () => {
        await fetchRuns();
        await fetchList();
        if (!["SCRAPING", "ENRICHING"].includes(list.value.status)) {
          stopPolling();
          if (list.value.status === "READY") {
            await fetchProspects();
          }
        }
      }, 2000);
    }

    async function onRun() {
      triggering.value = true;
      try {
        runs.value = await api.post(`/prospect-lists/${listId}/run`).then((res) => res.data);
        await fetchList();
        startPolling();
      } catch (err) {
        Notify.create({
          type: "negative",
          message: extractErrorMessage(err, "Unable to start"),
        });
      } finally {
        triggering.value = false;
      }
    }

    onMounted(async () => {
      try {
        await fetchList();
        await fetchRuns();
        await fetchUnipileStatus();
        if (["SCRAPING", "ENRICHING"].includes(list.value.status)) {
          startPolling();
        } else if (list.value.status === "READY") {
          await fetchProspects();
        }
      } catch (err) {
        Notify.create({
          type: "negative",
          message: extractErrorMessage(err, "Unable to load list"),
        });
      } finally {
        loading.value = false;
      }
    });

    onUnmounted(stopPolling);

    return {
      list,
      runs,
      prospects,
      loading,
      triggering,
      unipileConnected,
      prospectColumns: PROSPECT_COLUMNS,
      statusLabel,
      statusColor,
      runStatusLabel,
      runStatusColor,
      onRun,
    };
  },
});
</script>

<style scoped>
.heyfred-banner {
  background: var(--heyfred-peach);
  border: 1px solid var(--heyfred-border);
  border-radius: 15px;
}
</style>
