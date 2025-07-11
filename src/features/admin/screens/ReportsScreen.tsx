import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import CustomText from '@/shared/ui/CustomText';
import { Colors } from '@/shared/config/Colors';
import { supabase } from '@/shared/lib/supabase/client';
import { Report, ReportType, ReportReason } from '@/hooks/useReports';

interface ReportWithReporter extends Report {
  reporter?: {
    id: string;
    username?: string;
    full_name?: string;
    avatar_url?: string;
  };
}

export default function ReportsScreen() {
  const router = useRouter();
  const [reports, setReports] = useState<ReportWithReporter[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewing' | 'resolved'>('pending');
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadReports();
    loadStats();
  }, [filter]);

  const loadReports = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('reports')
        .select(`
          *,
          reporter:reporter_id(id, username, full_name, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error loading reports:', error);
      Alert.alert('Erreur', 'Impossible de charger les signalements');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const { data, error } = await supabase.rpc('get_report_stats');
      if (error) throw error;
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadReports();
    await loadStats();
    setRefreshing(false);
  };

  const handleReportPress = (report: ReportWithReporter) => {
    router.push({
      pathname: '/screens/admin/report-details',
      params: { reportId: report.id },
    });
  };

  const handleQuickAction = async (report: ReportWithReporter, action: 'resolve' | 'dismiss') => {
    Alert.alert(
      action === 'resolve' ? 'Résoudre' : 'Rejeter',
      `Êtes-vous sûr de vouloir ${action === 'resolve' ? 'résoudre' : 'rejeter'} ce signalement ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('reports')
                .update({
                  status: action === 'resolve' ? 'resolved' : 'dismissed',
                  resolved_at: new Date().toISOString(),
                  resolved_by: (await supabase.auth.getUser()).data.user?.id,
                })
                .eq('id', report.id);

              if (error) throw error;

              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              await loadReports();
            } catch (error) {
              Alert.alert('Erreur', 'Une erreur est survenue');
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
          },
        },
      ]
    );
  };

  const getReasonLabel = (reason: ReportReason) => {
    const labels: Record<ReportReason, string> = {
      inappropriate_content: 'Contenu inapproprié',
      spam: 'Spam',
      harassment: 'Harcèlement',
      fake_profile: 'Faux profil',
      inappropriate_name: 'Nom inapproprié',
      violence: 'Violence',
      hate_speech: 'Discours haineux',
      adult_content: 'Contenu adulte',
      misinformation: 'Désinformation',
      copyright: 'Violation de droits d\'auteur',
      other: 'Autre',
    };
    return labels[reason] || reason;
  };

  const getTypeIcon = (type: ReportType) => {
    const icons: Record<ReportType, string> = {
      user: 'person',
      event: 'calendar',
      message: 'chatbubble',
      story: 'camera',
      memory: 'images',
    };
    return icons[type] || 'alert-circle';
  };

  const renderReport = (report: ReportWithReporter) => {
    const targetName = report.reported_type;

    return (
      <TouchableOpacity
        key={report.id}
        style={styles.reportCard}
        onPress={() => handleReportPress(report)}
        activeOpacity={0.7}
      >
        <View style={styles.reportHeader}>
          <View style={styles.reportTypeIcon}>
            <Ionicons
              name={getTypeIcon(report.reported_type) as any}
              size={20}
              color={Colors.light.tint}
            />
          </View>
          <View style={styles.reportInfo}>
            <CustomText size="md" weight="bold">
              {targetName}
            </CustomText>
            <CustomText size="sm" color="#666">
              {getReasonLabel(report.reason)}
            </CustomText>
          </View>
          <View style={styles.reportStatus}>
            <View
              style={[
                styles.statusDot,
                report.status === 'pending' && styles.statusPending,
                report.status === 'reviewing' && styles.statusReviewing,
                report.status === 'resolved' && styles.statusResolved,
                report.status === 'dismissed' && styles.statusDismissed,
              ]}
            />
          </View>
        </View>

        {report.details && (
          <CustomText size="sm" color="#666" style={styles.reportDescription} numberOfLines={2}>
            {report.details}
          </CustomText>
        )}

        <View style={styles.reportFooter}>
          <View style={styles.reporterInfo}>
            {report.reporter?.avatar_url && (
              <Image
                source={{ uri: report.reporter.avatar_url }}
                style={styles.reporterAvatar}
              />
            )}
            <CustomText size="sm" color="#666">
              Par {report.reporter?.username || 'Utilisateur'}
            </CustomText>
          </View>
          <CustomText size="sm" color="#999">
            {new Date(report.created_at).toLocaleDateString('fr-FR')}
          </CustomText>
        </View>

        {report.status === 'pending' && (
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.quickActionBtn, styles.resolveBtn]}
              onPress={() => handleQuickAction(report, 'resolve')}
            >
              <Ionicons name="checkmark" size={18} color="#FFF" />
              <CustomText size="sm" color="#FFF" weight="bold">
                Résoudre
              </CustomText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickActionBtn, styles.dismissBtn]}
              onPress={() => handleQuickAction(report, 'dismiss')}
            >
              <Ionicons name="close" size={18} color="#FFF" />
              <CustomText size="sm" color="#FFF" weight="bold">
                Rejeter
              </CustomText>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <CustomText size="xl" weight="bold">
          Signalements
        </CustomText>
        <View style={styles.headerRight} />
      </View>

      {/* Stats */}
      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <CustomText size="xxl" weight="bold" color={Colors.light.tint}>
              {stats.pending_reports || 0}
            </CustomText>
            <CustomText size="sm" color="#666">
              En attente
            </CustomText>
          </View>
          <View style={styles.statCard}>
            <CustomText size="xxl" weight="bold">
              {stats.total_reports || 0}
            </CustomText>
            <CustomText size="sm" color="#666">
              Total
            </CustomText>
          </View>
          <View style={styles.statCard}>
            <CustomText size="xxl" weight="bold" color="#4CAF50">
              {stats.resolved_reports || 0}
            </CustomText>
            <CustomText size="sm" color="#666">
              Résolus
            </CustomText>
          </View>
        </View>
      )}

      {/* Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        {['all', 'pending', 'reviewing', 'resolved'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterBtn,
              filter === f && styles.filterBtnActive,
            ]}
            onPress={() => setFilter(f as any)}
          >
            <CustomText
              size="sm"
              weight={filter === f ? 'bold' : 'normal'}
              color={filter === f ? '#FFF' : Colors.light.text}
            >
              {f === 'all' ? 'Tous' : 
               f === 'pending' ? 'En attente' :
               f === 'reviewing' ? 'En cours' : 'Résolus'}
            </CustomText>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Reports List */}
      <ScrollView
        style={styles.reportsList}
        contentContainerStyle={styles.reportsContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {loading ? (
          <ActivityIndicator size="large" color={Colors.light.tint} style={styles.loader} />
        ) : reports.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle" size={64} color="#CCC" />
            <CustomText size="md" color="#666" style={styles.emptyText}>
              Aucun signalement {filter !== 'all' && filter}
            </CustomText>
          </View>
        ) : (
          reports.map(renderReport)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FFF',
  },
  backButton: {
    padding: 5,
  },
  headerRight: {
    width: 34,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFF',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  filtersContainer: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  filtersContent: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 10,
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
  },
  filterBtnActive: {
    backgroundColor: Colors.light.tint,
  },
  reportsList: {
    flex: 1,
  },
  reportsContent: {
    padding: 20,
    gap: 15,
  },
  reportCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  reportTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  reportInfo: {
    flex: 1,
  },
  reportStatus: {
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusPending: {
    backgroundColor: '#FF9500',
  },
  statusReviewing: {
    backgroundColor: '#007AFF',
  },
  statusResolved: {
    backgroundColor: '#4CAF50',
  },
  statusDismissed: {
    backgroundColor: '#999',
  },
  reportDescription: {
    marginBottom: 10,
  },
  reportFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reporterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reporterAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  resolveBtn: {
    backgroundColor: '#4CAF50',
  },
  dismissBtn: {
    backgroundColor: '#999',
  },
  loader: {
    marginTop: 50,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    marginTop: 20,
  },
});