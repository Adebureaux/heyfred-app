<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div class="text-h5">Campagnes</div>
      <q-btn color="primary" icon="add" label="Nouvelle campagne" to="/campaigns/new" />
    </div>

    <q-spinner v-if="loading" color="primary" size="2em" />

    <q-banner v-else-if="campaigns.length === 0" class="bg-grey-2">
      Aucune campagne pour le moment. Créez votre première campagne pour définir le type de
      prospect à cibler.
    </q-banner>

    <q-list v-else bordered separator>
      <q-item
        v-for="campaign in campaigns"
        :key="campaign.id"
        clickable
        :to="`/campaigns/${campaign.id}`"
      >
        <q-item-section>
          <q-item-label>{{ campaign.name }}</q-item-label>
          <q-item-label caption>
            {{ campaign.targetSector }} · {{ campaign.targetLocation }}
          </q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-chip :color="statusColor(campaign.status)" text-color="white" dense>
            {{ statusLabel(campaign.status) }}
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
import { CAMPAIGN_STATUS_LABELS, CAMPAIGN_STATUS_COLORS } from "src/utils/campaign-status";
import { extractErrorMessage } from "src/utils/error-message";

export default defineComponent({
  name: "CampaignsListPage",
  setup() {
    const campaigns = ref([]);
    const loading = ref(true);

    onMounted(async () => {
      try {
        const { data } = await api.get("/campaigns");
        campaigns.value = data;
      } catch (err) {
        Notify.create({
          type: "negative",
          message: extractErrorMessage(err, "Impossible de charger les campagnes"),
        });
      } finally {
        loading.value = false;
      }
    });

    function statusLabel(status) {
      return CAMPAIGN_STATUS_LABELS[status] ?? status;
    }

    function statusColor(status) {
      return CAMPAIGN_STATUS_COLORS[status] ?? "grey";
    }

    return { campaigns, loading, statusLabel, statusColor };
  },
});
</script>
