<template>
  <q-page class="q-pa-md">
    <q-spinner v-if="loading" color="primary" size="2em" />

    <template v-else-if="campaign">
      <div class="row items-center justify-between q-mb-md">
        <div>
          <div class="text-h5">{{ campaign.name }}</div>
          <div class="text-caption text-grey">
            {{ campaign.targetSector }} · {{ campaign.targetLocation }}
          </div>
        </div>
        <q-chip :color="statusColor(campaign.status)" text-color="white">
          {{ statusLabel(campaign.status) }}
        </q-chip>
      </div>

      <q-card flat bordered class="q-mb-md">
        <q-card-section>
          <div class="text-subtitle2 q-mb-sm">Ciblage</div>
          <div class="q-gutter-xs">
            <q-chip v-for="title in campaign.targetJobTitles" :key="title" dense outline>
              {{ title }}
            </q-chip>
          </div>
          <div v-if="campaign.targetKeywords" class="text-body2 q-mt-xs">
            Mots-clés : {{ campaign.targetKeywords }}
          </div>
        </q-card-section>
      </q-card>

      <q-card v-if="campaign.status === 'TARGETING_SET'" flat bordered class="q-mb-md">
        <q-card-section class="row items-center justify-between">
          <div>Prêt à rechercher les entreprises et décideurs correspondant à ce ciblage.</div>
          <q-btn
            color="primary"
            label="Lancer le scraping"
            :loading="triggering"
            @click="onTriggerScraping"
          />
        </q-card-section>
      </q-card>

      <q-card v-if="jobs.length > 0" flat bordered class="q-mb-md">
        <q-card-section>
          <div class="text-subtitle2 q-mb-sm">Progression du scraping</div>
          <q-list dense>
            <q-item v-for="job in jobs" :key="job.id">
              <q-item-section avatar>
                <q-icon
                  :name="job.stage === 'COMPANY_SEARCH' ? 'business' : 'person_search'"
                  :color="jobStatusColor(job.status)"
                />
              </q-item-section>
              <q-item-section>
                {{ job.stage === "COMPANY_SEARCH" ? "Recherche d'entreprises" : "Recherche de décideurs" }}
                <div v-if="job.status === 'SUCCEEDED'" class="text-caption text-grey">
                  {{ job.resultCount ?? 0 }} résultat{{ job.resultCount === 1 ? "" : "s" }}
                </div>
              </q-item-section>
              <q-item-section side>
                <q-spinner v-if="job.status === 'RUNNING'" color="primary" size="1.2em" />
                <q-chip v-else dense :color="jobStatusColor(job.status)" text-color="white">
                  {{ jobStatusLabel(job.status) }}
                </q-chip>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
      </q-card>

      <q-banner v-if="campaign.status === 'SCRAPED' && contacts.length === 0" class="bg-orange-1">
        Le scraping s'est terminé mais n'a trouvé aucun contact correspondant à ce ciblage. Essayez
        d'élargir les postes visés ou de vérifier la localisation renseignée.
      </q-banner>

      <q-card v-if="contacts.length > 0" flat bordered>
        <q-card-section>
          <div class="text-subtitle2 q-mb-sm">Contacts trouvés ({{ contacts.length }})</div>
          <q-table
            :rows="contacts"
            :columns="contactColumns"
            row-key="id"
            flat
            dense
            :pagination="{ rowsPerPage: 10 }"
          >
            <template #body-cell-linkedinUrl="props">
              <q-td :props="props">
                <a v-if="props.value" :href="props.value" target="_blank" rel="noopener">Profil</a>
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
import { CAMPAIGN_STATUS_LABELS, CAMPAIGN_STATUS_COLORS } from "src/utils/campaign-status";
import { extractErrorMessage } from "src/utils/error-message";

const JOB_STATUS_LABELS = {
  QUEUED: "En attente",
  RUNNING: "En cours",
  SUCCEEDED: "Terminé",
  FAILED: "Échec",
};

const JOB_STATUS_COLORS = {
  QUEUED: "grey",
  RUNNING: "primary",
  SUCCEEDED: "positive",
  FAILED: "negative",
};

const CONTACT_COLUMNS = [
  { name: "firstName", label: "Prénom", field: "firstName", align: "left" },
  { name: "lastName", label: "Nom", field: "lastName", align: "left" },
  { name: "jobTitle", label: "Poste", field: "jobTitle", align: "left" },
  {
    name: "company",
    label: "Entreprise",
    field: (row) => row.company?.name ?? "",
    align: "left",
  },
  { name: "email", label: "Email", field: "email", align: "left" },
  { name: "linkedinUrl", label: "LinkedIn", field: "linkedinUrl", align: "left" },
];

export default defineComponent({
  name: "CampaignDetailPage",
  setup() {
    const route = useRoute();
    const campaignId = route.params.id;

    const campaign = ref(null);
    const jobs = ref([]);
    const contacts = ref([]);
    const loading = ref(true);
    const triggering = ref(false);
    let pollHandle = null;

    function statusLabel(status) {
      return CAMPAIGN_STATUS_LABELS[status] ?? status;
    }

    function statusColor(status) {
      return CAMPAIGN_STATUS_COLORS[status] ?? "grey";
    }

    function jobStatusLabel(status) {
      return JOB_STATUS_LABELS[status] ?? status;
    }

    function jobStatusColor(status) {
      return JOB_STATUS_COLORS[status] ?? "grey";
    }

    async function fetchCampaign() {
      const { data } = await api.get(`/campaigns/${campaignId}`);
      campaign.value = data;
    }

    async function fetchJobs() {
      const { data } = await api.get(`/campaigns/${campaignId}/scraping-jobs`);
      jobs.value = data;
    }

    async function fetchContacts() {
      const { data } = await api.get(`/campaigns/${campaignId}/contacts`);
      contacts.value = data;
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
        await fetchJobs();
        await fetchCampaign();
        if (campaign.value.status !== "SCRAPING") {
          stopPolling();
          if (campaign.value.status === "SCRAPED") {
            await fetchContacts();
          }
        }
      }, 2000);
    }

    async function onTriggerScraping() {
      triggering.value = true;
      try {
        jobs.value = await api.post(`/campaigns/${campaignId}/scraping`).then((res) => res.data);
        contacts.value = [];
        await fetchCampaign();
        startPolling();
      } catch (err) {
        Notify.create({
          type: "negative",
          message: extractErrorMessage(err, "Impossible de lancer le scraping"),
        });
      } finally {
        triggering.value = false;
      }
    }

    onMounted(async () => {
      try {
        await fetchCampaign();
        await fetchJobs();
        if (campaign.value.status === "SCRAPING") {
          startPolling();
        } else if (campaign.value.status === "SCRAPED") {
          await fetchContacts();
        }
      } catch (err) {
        Notify.create({
          type: "negative",
          message: extractErrorMessage(err, "Impossible de charger la campagne"),
        });
      } finally {
        loading.value = false;
      }
    });

    onUnmounted(stopPolling);

    return {
      campaign,
      jobs,
      contacts,
      loading,
      triggering,
      contactColumns: CONTACT_COLUMNS,
      statusLabel,
      statusColor,
      jobStatusLabel,
      jobStatusColor,
      onTriggerScraping,
    };
  },
});
</script>
