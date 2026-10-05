import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useExtensions } from '../context/ExtensionContext';
import { NeumorphicBox } from './neumorphic/NeumorphicBox';
import { NeumorphicButton } from './neumorphic/NeumorphicButton';
import { NeumorphicInput } from './neumorphic/NeumorphicInput';

interface CustomExtensionModalProps {
  visible: boolean;
  onClose: () => void;
}

export const CustomExtensionModal: React.FC<CustomExtensionModalProps> = ({
  visible,
  onClose,
}) => {
  const { palette } = useTheme();
  const { addCustomExtension } = useExtensions();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [urlPattern, setUrlPattern] = useState('*://*.youtube.com/*');
  const [cssCode, setCssCode] = useState('/* Add custom CSS rules here */\n');
  const [jsCode, setJsCode] = useState(
    '// Custom Userscript\nconsole.log("[Custom Script] Running on:", window.location.href);'
  );

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Please enter an extension name.');
      return;
    }

    addCustomExtension({
      name: name.trim(),
      description: description.trim() || 'Custom user extension',
      version: '1.0.0',
      author: 'You',
      icon: 'code-slash',
      category: 'custom',
      enabled: true,
      urlMatches: [urlPattern.trim() || '*://*.youtube.com/*'],
      runAt: 'document_end',
      injectedCSS: cssCode,
      injectedJSEnd: jsCode,
      settings: [],
      userSettings: {},
    });

    // Reset fields
    setName('');
    setDescription('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContent,
            { backgroundColor: palette.surface, borderColor: palette.surfaceBorder },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.headerIconBox, { backgroundColor: '#EC4899' }]}>
                <Ionicons name="code-slash" size={18} color="#FFF" />
              </View>
              <Text style={[styles.title, { color: palette.textPrimary }]}>
                New Custom Extension
              </Text>
            </View>

            <NeumorphicButton
              onPress={onClose}
              size="sm"
              style={styles.closeBtn}
              icon={<Ionicons name="close" size={20} color={palette.textPrimary} />}
            />
          </View>

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Name */}
            <Text style={[styles.inputLabel, { color: palette.textPrimary }]}>
              Extension Name *
            </Text>
            <NeumorphicInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Cinema Ambient Mode"
              containerStyle={styles.inputContainer}
            />

            {/* Description */}
            <Text style={[styles.inputLabel, { color: palette.textPrimary }]}>
              Description
            </Text>
            <NeumorphicInput
              value={description}
              onChangeText={setDescription}
              placeholder="e.g. Enhances video container contrast"
              containerStyle={styles.inputContainer}
            />

            {/* URL Pattern */}
            <Text style={[styles.inputLabel, { color: palette.textPrimary }]}>
              URL Match Pattern
            </Text>
            <NeumorphicInput
              value={urlPattern}
              onChangeText={setUrlPattern}
              placeholder="*://*.youtube.com/*"
              containerStyle={styles.inputContainer}
            />

            {/* CSS Code Editor */}
            <Text style={[styles.inputLabel, { color: palette.textPrimary }]}>
              Custom Injected CSS
            </Text>
            <NeumorphicBox state="inset" borderRadius={14} style={styles.codeEditorBox}>
              <TextInput
                value={cssCode}
                onChangeText={setCssCode}
                multiline
                textAlignVertical="top"
                autoCapitalize="none"
                autoCorrect={false}
                style={[
                  styles.codeInput,
                  {
                    color: palette.isDark ? '#38BDF8' : '#0284C7',
                  },
                ]}
              />
            </NeumorphicBox>

            {/* JavaScript Code Editor */}
            <Text style={[styles.inputLabel, { color: palette.textPrimary }]}>
              Custom Injected JavaScript (Runs in Page Context)
            </Text>
            <NeumorphicBox state="inset" borderRadius={14} style={styles.codeEditorBox}>
              <TextInput
                value={jsCode}
                onChangeText={setJsCode}
                multiline
                textAlignVertical="top"
                autoCapitalize="none"
                autoCorrect={false}
                style={[
                  styles.codeInput,
                  {
                    color: palette.isDark ? '#4ADE80' : '#16A34A',
                  },
                ]}
              />
            </NeumorphicBox>

            {/* Actions */}
            <View style={styles.buttonRow}>
              <NeumorphicButton
                onPress={onClose}
                title="Cancel"
                style={{ flex: 1, marginRight: 10 }}
              />
              <NeumorphicButton
                onPress={handleSave}
                title="Save & Install"
                variant="accent"
                style={{ flex: 1 }}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '90%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    minWidth: 36,
    minHeight: 36,
    borderRadius: 18,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 6,
  },
  inputContainer: {
    marginBottom: 8,
  },
  codeEditorBox: {
    padding: 12,
    minHeight: 120,
    marginBottom: 12,
  },
  codeInput: {
    fontFamily: 'monospace',
    fontSize: 12,
    minHeight: 100,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 16,
    marginBottom: 20,
  },
});
