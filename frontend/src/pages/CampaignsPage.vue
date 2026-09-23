<template>
  <q-page>
    <div class="page-heading q-mb-md">
      <div>
        <div class="eyebrow">Campaigns</div>
        <div class="text-h5">Campaigns</div>
        <div class="text-caption text-grey">Reach out to your prospects at scale.</div>
      </div>
    </div>

    <div class="empty-section">
      <q-icon name="campaign" size="30px" color="grey-6" />
      <h2>Campaigns are coming soon</h2>
      <p>We're rebuilding this from the ground up. Check back soon.</p>
    </div>
  </q-page>
</template>

<script>
import { defineComponent } from "vue";

export default defineComponent({
  name: "CampaignsPage",
});
</script>

<style scoped>
.eyebrow {
  color: var(--heyfred-muted);
  font-size: 11px;
  letter-spacing: 1.2px;
  text-transform: uppercase;
}
.empty-section {
  padding: 70px 30px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  background: #fff;
  border: 1px solid var(--heyfred-border);
  border-radius: 10px;
}
.empty-section h2 {
  font-size: 20px;
  font-weight: 500;
  letter-spacing: -0.5px;
  margin: 0;
}
.empty-section p {
  font-size: 14px;
  color: var(--heyfred-muted);
  margin: 0;
}
</style>
