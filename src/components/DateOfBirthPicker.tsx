import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { colors } from '../constants/theme';
import { calculateAge } from '../utils/validation';
import { AppIcon } from './AppIcon';
import { PressableScale } from '../motion';

interface DateOfBirthPickerProps {
  value?: string;
  onChange: (dateOfBirth: string, age: number) => void;
  error?: boolean;
  label?: string;
}

function parseDate(value?: string): Date {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(2000, 0, 1);
}

function maxEligibleDob(): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 13);
  return d;
}

export function DateOfBirthPicker({
  value,
  onChange,
  error,
  label = 'Date of Birth *',
}: DateOfBirthPickerProps) {
  const [show, setShow] = useState(false);
  const selected = parseDate(value);
  const maxDate = maxEligibleDob();

  const applyDate = (date: Date) => {
    const iso = format(date, 'yyyy-MM-dd');
    onChange(iso, calculateAge(iso));
  };

  const onPickerChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShow(false);
      if (event.type === 'dismissed') return;
    }
    if (date) {
      applyDate(date);
    }
  };

  return (
    <View style={styles.wrap}>
      <PressableScale onPress={() => setShow(true)} pressedScale={0.985}>
        <View pointerEvents="none">
          <TextInput
            label={label}
            value={value ?? ''}
            mode="outlined"
            editable={false}
            right={<TextInput.Icon icon="calendar" color={colors.lime[500]} />}
            style={styles.input}
            textColor={colors.silver[100]}
            outlineColor={error ? '#EF4444' : colors.forest[600]}
            activeOutlineColor={colors.lime[500]}
            theme={{
              colors: {
                onSurfaceVariant: colors.silver[400],
                primary: colors.lime[500],
              },
            }}
          />
        </View>
      </PressableScale>

      {Platform.OS === 'android' && show && (
        <DateTimePicker
          value={selected > maxDate ? maxDate : selected}
          mode="date"
          display="default"
          maximumDate={maxDate}
          minimumDate={new Date(1960, 0, 1)}
          onChange={onPickerChange}
        />
      )}

      {Platform.OS === 'ios' && (
        <Modal visible={show} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Date of Birth</Text>
                <TouchableOpacity onPress={() => setShow(false)}>
                  <AppIcon name="check" size={24} color={colors.lime[500]} />
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={selected > maxDate ? maxDate : selected}
                mode="date"
                display="spinner"
                maximumDate={maxDate}
                minimumDate={new Date(1960, 0, 1)}
                onChange={onPickerChange}
                themeVariant="dark"
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 4,
  },
  input: {
    backgroundColor: colors.forest[900],
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  modalCard: {
    backgroundColor: colors.forest[800],
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    borderColor: colors.forest[600],
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    color: colors.silver[50],
    fontWeight: '800',
    fontSize: 16,
  },
});
