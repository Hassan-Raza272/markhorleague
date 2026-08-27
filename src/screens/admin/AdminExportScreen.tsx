import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from 'react-native';
import { Text } from 'react-native-paper';
import Share from 'react-native-share';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { GradientBackground } from '../../components/GradientBackground';
import { LeagueHeader } from '../../components/LeagueHeader';
import { AppIcon } from '../../components/AppIcon';
import { PremiumButton } from '../../components/PremiumButton';
import { PremiumFilterGroup } from '../../components/PremiumFilterGroup';
import { colors } from '../../constants/theme';
import { getAllPlayers } from '../../services/playerService';
import { getFranchises } from '../../services/draftService';
import {
  buildPremiumPlayersPdfBase64,
  filterPlayersForPdfExport,
  getPdfCategoryScopeLabel,
  getPdfExportScopeLabel,
  getPdfKitSizeScopeLabel,
  getPdfSquadRoleScopeLabel,
  getPlayerExportStats,
  getPremiumPdfFilename,
  PDF_CATEGORY_SCOPES,
  PDF_EXPORT_SCOPES,
  PDF_KIT_SIZE_SCOPES,
  PDF_SQUAD_ROLE_SCOPES,
  PdfCategoryScope,
  PdfExportScope,
  PdfKitSizeScope,
  PdfSquadRoleScope,
} from '../../utils/exportPlayersPdf';
import type { Franchise, Player } from '../../types';
import { usePremiumAlert } from '../../components/PremiumAlertProvider';
import { PremiumStatCard } from '../../components/PremiumStatCard';
import { EnterView, PopIn } from '../../motion';

function isShareCancelled(message: string): boolean {
  return (
    message.includes('User did not share') ||
    message.includes('User cancelled') ||
    message.includes('canceled')
  );
}

const STATUS_ACCENTS: Partial<Record<PdfExportScope, string>> = {
  PENDING: colors.status.pending,
  APPROVED: colors.status.approved,
  REJECTED: colors.status.rejected,
  ALL: colors.gold[500],
};

export function AdminExportScreen() {
  const { alert } = usePremiumAlert();
  const [players, setPlayers] = useState<Player[]>([]);
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<'share' | 'download' | null>(null);
  const [exportScope, setExportScope] = useState<PdfExportScope>('ALL');
  const [exportCategory, setExportCategory] =
    useState<PdfCategoryScope>('ALL');
  const [exportKitSize, setExportKitSize] = useState<PdfKitSizeScope>('ALL');
  const [exportSquadRole, setExportSquadRole] =
    useState<PdfSquadRoleScope>('ALL');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [playerData, franchiseData] = await Promise.all([
        getAllPlayers(),
        getFranchises(),
      ]);
      setPlayers(playerData);
      setFranchises(franchiseData);
    } catch (e: unknown) {
      alert(
        'Error',
        e instanceof Error ? e.message : 'Failed to load players',
      );
    } finally {
      setLoading(false);
    }
  }, [alert]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => getPlayerExportStats(players), [players]);

  const exportPlayers = useMemo(
    () =>
      filterPlayersForPdfExport(
        players,
        exportScope,
        exportCategory,
        exportKitSize,
        exportSquadRole,
        franchises,
      ),
    [
      players,
      exportScope,
      exportCategory,
      exportKitSize,
      exportSquadRole,
      franchises,
    ],
  );

  const hasCustomFilters =
    exportScope !== 'ALL' ||
    exportCategory !== 'ALL' ||
    exportKitSize !== 'ALL' ||
    exportSquadRole !== 'ALL';

  const resetFilters = () => {
    setExportScope('ALL');
    setExportCategory('ALL');
    setExportKitSize('ALL');
    setExportSquadRole('ALL');
  };

  const filterSummary = `${getPdfExportScopeLabel(exportScope)} · ${getPdfCategoryScopeLabel(exportCategory)} · ${getPdfKitSizeScopeLabel(exportKitSize)} · ${getPdfSquadRoleScopeLabel(exportSquadRole)}`;

  const sharePdf = async () => {
    if (exportPlayers.length === 0) {
      alert('No players', `No players found for "${filterSummary}".`);
      return;
    }

    setExporting('share');
    try {
      const base64 = await buildPremiumPlayersPdfBase64(exportPlayers, {
        statusScope: exportScope,
        categoryScope: exportCategory,
        kitSizeScope: exportKitSize,
        squadRoleScope: exportSquadRole,
      });
      const filename = getPremiumPdfFilename(
        exportScope,
        exportCategory,
        exportKitSize,
        exportSquadRole,
      );

      await Share.open({
        title: `MCL 2026-27 · ${filterSummary}`,
        subject: `MCL 2026-27 Players (${filterSummary})`,
        message: `MCL 2026-27 Official Player List · ${filterSummary} (${exportPlayers.length})`,
        filename,
        type: 'application/pdf',
        url: `data:application/pdf;base64,${base64}`,
        useInternalStorage: true,
        failOnCancel: false,
      });
    } catch (e: unknown) {
      const message =
        e instanceof Error
          ? e.message
          : typeof e === 'object' && e && 'message' in e
            ? String((e as { message: string }).message)
            : 'Could not share PDF.';
      if (isShareCancelled(message)) return;
      alert('Share failed', message);
    } finally {
      setExporting(null);
    }
  };

  const downloadPdf = async () => {
    if (exportPlayers.length === 0) {
      alert('No players', `No players found for "${filterSummary}".`);
      return;
    }

    setExporting('download');
    try {
      const base64 = await buildPremiumPlayersPdfBase64(exportPlayers, {
        statusScope: exportScope,
        categoryScope: exportCategory,
        kitSizeScope: exportKitSize,
        squadRoleScope: exportSquadRole,
      });
      const filename = getPremiumPdfFilename(
        exportScope,
        exportCategory,
        exportKitSize,
        exportSquadRole,
      );
      const { dirs } = ReactNativeBlobUtil.fs;
      const dir =
        Platform.OS === 'ios' ? dirs.DocumentDir : dirs.DownloadDir;
      const path = `${dir}/${filename}`;

      await ReactNativeBlobUtil.fs.writeFile(path, base64, 'base64');

      if (Platform.OS === 'android') {
        try {
          await ReactNativeBlobUtil.MediaCollection.copyToMediaStore(
            {
              name: filename,
              parentFolder: 'MCL2026',
              mimeType: 'application/pdf',
            },
            'Download',
            path,
          );
        } catch {
          // File still saved to DownloadDir even if MediaStore copy fails
        }
      }

      alert(
        'Downloaded',
        Platform.OS === 'ios'
          ? `Saved as ${filename} in app Documents.`
          : `Saved to Downloads as ${filename}`,
      );
    } catch (e: unknown) {
      alert(
        'Download failed',
        e instanceof Error ? e.message : 'Could not save PDF.',
      );
    } finally {
      setExporting(null);
    }
  };

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={load}
            tintColor={colors.lime[500]}
            colors={[colors.lime[500]]}
          />
        }>
        <LeagueHeader compact subtitle="Official PDF Export" />

        <View style={styles.statsRow}>
          <PremiumStatCard
            label="Pending"
            value={stats.pending}
            icon="clock-outline"
            accent={colors.status.pending}
          />
          <PremiumStatCard
            label="Approved"
            value={stats.approved}
            icon="check-circle"
            accent={colors.status.approved}
          />
          <PremiumStatCard
            label="Rejected"
            value={stats.rejected}
            icon="close-circle"
            accent={colors.status.rejected}
          />
          <PremiumStatCard
            label="Total"
            value={stats.total}
            icon="account-group"
            accent={colors.lime[500]}
          />
        </View>

        <EnterView delay={120} fromY={22} style={styles.filterPanel}>
          <View style={styles.filterPanelHeader}>
            <View style={styles.filterPanelTitleRow}>
              <View style={styles.filterPanelIcon}>
                <AppIcon name="filter-variant" size={20} color={colors.gold[500]} />
              </View>
              <View style={styles.filterPanelTitleWrap}>
                <Text style={styles.filterPanelTitle}>Export Filters</Text>
                <Text style={styles.filterPanelHint}>
                  Refine the player list before generating your PDF
                </Text>
              </View>
            </View>
            {hasCustomFilters ? (
              <Pressable onPress={resetFilters} style={styles.resetBtn}>
                <AppIcon name="refresh" size={14} color={colors.lime[500]} />
                <Text style={styles.resetText}>Reset</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.goldAccent} />

          <PremiumFilterGroup
            title="Registration Status"
            subtitle="Include players by approval status"
            icon="shield-check"
            value={exportScope}
            onChange={setExportScope}
            columns={2}
            options={PDF_EXPORT_SCOPES.map(scope => ({
              value: scope.key,
              label: scope.label,
              accent: STATUS_ACCENTS[scope.key],
            }))}
          />

          <PremiumFilterGroup
            title="Player Category"
            subtitle="Junior, Senior, Emerging, or unassigned"
            icon="trophy"
            value={exportCategory}
            onChange={setExportCategory}
            columns={2}
            options={PDF_CATEGORY_SCOPES.map(scope => ({
              value: scope.key,
              label: scope.label,
              accent: colors.gold[500],
            }))}
          />

          <PremiumFilterGroup
            title="Uniform Size"
            subtitle="Filter by kit / uniform size"
            icon="tshirt-crew"
            value={exportKitSize}
            onChange={setExportKitSize}
            layout="scroll"
            options={PDF_KIT_SIZE_SCOPES.map(scope => ({
              value: scope.key,
              label: scope.label,
              accent: colors.lime[500],
            }))}
          />

          <PremiumFilterGroup
            title="Owner & Locked Players"
            subtitle="Exclude franchise owners and locked squad players"
            icon="account-lock"
            value={exportSquadRole}
            onChange={setExportSquadRole}
            columns={2}
            options={PDF_SQUAD_ROLE_SCOPES.map(scope => ({
              value: scope.key,
              label: scope.label,
              accent:
                scope.key === 'WITHOUT_OWNER_LOCKS'
                  ? colors.gold[500]
                  : colors.lime[500],
            }))}
            style={styles.lastFilterSection}
          />
        </EnterView>

        <EnterView delay={200} fromY={24} fromScale={0.97} style={styles.previewCard}>
          <View style={styles.previewHeader}>
            <View style={styles.previewIconWrap}>
              <AppIcon name="file-pdf-box" size={28} color={colors.forest[950]} />
            </View>
            <View style={styles.previewHeaderText}>
              <Text style={styles.previewTitle}>Export Preview</Text>
              <Text style={styles.previewCount}>
                {exportPlayers.length} player{exportPlayers.length === 1 ? '' : 's'} selected
              </Text>
            </View>
          </View>

          <View style={styles.tagRow}>
            <View style={styles.tag}>
              <Text style={styles.tagLabel}>Status</Text>
              <Text style={styles.tagValue}>
                {getPdfExportScopeLabel(exportScope)}
              </Text>
            </View>
            <View style={styles.tagDivider} />
            <View style={styles.tag}>
              <Text style={styles.tagLabel}>Category</Text>
              <Text style={styles.tagValue}>
                {getPdfCategoryScopeLabel(exportCategory)}
              </Text>
            </View>
            <View style={styles.tagDivider} />
            <View style={styles.tag}>
              <Text style={styles.tagLabel}>Size</Text>
              <Text style={styles.tagValue}>
                {getPdfKitSizeScopeLabel(exportKitSize)}
              </Text>
            </View>
            <View style={styles.tagDivider} />
            <View style={styles.tag}>
              <Text style={styles.tagLabel}>Squad</Text>
              <Text style={styles.tagValue}>
                {exportSquadRole === 'WITHOUT_OWNER_LOCKS'
                  ? 'No owner/locks'
                  : 'All'}
              </Text>
            </View>
          </View>

          {exportPlayers.length === 0 && !loading ? (
            <View style={styles.emptyBanner}>
              <AppIcon name="alert-circle-outline" size={18} color={colors.status.pending} />
              <Text style={styles.emptyText}>
                No players match these filters. Try adjusting your selection.
              </Text>
            </View>
          ) : null}
        </EnterView>

        <PopIn delay={280} style={styles.exportRow}>
          <PremiumButton
            variant="outline"
            onPress={sharePdf}
            loading={exporting === 'share'}
            disabled={!!exporting || loading || exportPlayers.length === 0}
            icon={() =>
              exporting === 'share' ? (
                <ActivityIndicator color={colors.lime[500]} size="small" />
              ) : (
                <AppIcon name="share-variant" size={18} color={colors.lime[500]} />
              )
            }
            style={styles.exportHalf}
            contentStyle={styles.exportContent}
            labelStyle={styles.exportLabelText}>
            Share PDF
          </PremiumButton>

          <PremiumButton
            onPress={downloadPdf}
            loading={exporting === 'download'}
            disabled={!!exporting || loading || exportPlayers.length === 0}
            icon={() =>
              exporting === 'download' ? (
                <ActivityIndicator color={colors.forest[950]} size="small" />
              ) : (
                <AppIcon name="download" size={18} color={colors.forest[950]} />
              )
            }
            style={styles.exportHalf}
            contentStyle={styles.exportContent}
            labelStyle={styles.exportLabelText}>
            Download PDF
          </PremiumButton>
        </PopIn>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 48,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterPanel: {
    backgroundColor: colors.forest[800],
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.forest[600],
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
    marginBottom: 16,
    overflow: 'hidden',
  },
  filterPanelHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  filterPanelTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
  },
  filterPanelIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: `${colors.gold[500]}22`,
    borderWidth: 1,
    borderColor: `${colors.gold[500]}44`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPanelTitleWrap: {
    flex: 1,
  },
  filterPanelTitle: {
    color: colors.silver[50],
    fontSize: 17,
    fontWeight: '900',
  },
  filterPanelHint: {
    color: colors.silver[400],
    fontSize: 12,
    marginTop: 3,
    lineHeight: 17,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.forest[600],
    backgroundColor: colors.forest[900],
  },
  resetText: {
    color: colors.lime[500],
    fontSize: 12,
    fontWeight: '700',
  },
  goldAccent: {
    height: 2,
    backgroundColor: colors.gold[500],
    borderRadius: 1,
    marginBottom: 4,
    opacity: 0.85,
  },
  lastFilterSection: {
    borderBottomWidth: 0,
    paddingBottom: 8,
  },
  previewCard: {
    backgroundColor: colors.forest[800],
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.gold[500],
    padding: 16,
    marginBottom: 16,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  previewIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.lime[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewHeaderText: {
    flex: 1,
  },
  previewTitle: {
    color: colors.silver[50],
    fontWeight: '900',
    fontSize: 16,
  },
  previewCount: {
    color: colors.gold[400],
    marginTop: 2,
    fontSize: 14,
    fontWeight: '700',
  },
  tagRow: {
    flexDirection: 'row',
    backgroundColor: colors.forest[900],
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.forest[700],
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  tag: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  tagLabel: {
    color: colors.silver[400],
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  tagValue: {
    color: colors.silver[50],
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
    textAlign: 'center',
  },
  tagDivider: {
    width: 1,
    backgroundColor: colors.forest[600],
    marginVertical: 2,
  },
  emptyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: `${colors.status.pending}15`,
    borderWidth: 1,
    borderColor: `${colors.status.pending}33`,
  },
  emptyText: {
    flex: 1,
    color: colors.silver[300],
    fontSize: 12,
    lineHeight: 17,
  },
  exportRow: {
    flexDirection: 'row',
    gap: 10,
  },
  exportHalf: {
    flex: 1,
  },
  exportContent: {
    paddingVertical: 4,
  },
  exportLabelText: {
    fontSize: 13,
  },
});
