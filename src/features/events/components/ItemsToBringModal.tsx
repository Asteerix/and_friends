import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomModal from './BottomModal';

type ItemType = 'required' | 'suggested' | 'open';

interface Item {
  id: string;
  name: string;
  assignee: string;
  quantity?: string;
  showQuantity?: boolean;
  showAssignee?: boolean;
  type: ItemType;
}

interface ItemsToBringModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (items: Item[], settings: BringSettings) => void;
}

interface BringSettings {
  allowGuestSuggestions: boolean;
  requireSignup: boolean;
  showQuantities: boolean;
}

const ITEM_TYPE_CONFIG = {
  required: {
    label: 'Required',
    color: '#FF3B30',
    icon: 'alert-circle',
    description: 'Guests must bring this'
  },
  suggested: {
    label: 'Suggested',
    color: '#FF9500',
    icon: 'bulb-outline',
    description: 'Nice to have'
  },
  open: {
    label: 'Open',
    color: '#34C759',
    icon: 'add-circle-outline',
    description: 'Guest can choose'
  }
};

const QUICK_ADD_SUGGESTIONS = [
  // Most Popular - Food & Drinks
  { label: '🥤 Drinks', description: 'Soft drinks', category: 'food' },
  { label: '🍺 Beer', description: 'Beer', category: 'food' },
  { label: '🍿 Snacks', description: 'Chips & snacks', category: 'food' },
  { label: '🍕 Pizza', description: 'Pizza', category: 'food' },
  { label: '🧊 Ice', description: 'Ice bags', category: 'food' },
  { label: '🍷 Wine', description: 'Wine', category: 'food' },
  
  // Essential Supplies
  { label: '🥤 Cups', description: 'Plastic cups', category: 'supplies' },
  { label: '🍽️ Plates', description: 'Paper plates', category: 'supplies' },
  { label: '🧻 Napkins', description: 'Napkins', category: 'supplies' },
  { label: '🗑️ Trash bags', description: 'Garbage bags', category: 'supplies' },
  
  // Popular Entertainment
  { label: '🔊 Speakers', description: 'Bluetooth speaker', category: 'entertainment' },
  { label: '🎵 Playlist', description: 'Music playlist', category: 'entertainment' },
  
  // Common Items
  { label: '🧊 Cooler', description: 'Cooler box', category: 'supplies' },
  { label: '🎂 Cake', description: 'Birthday cake', category: 'food' },
  { label: '🥗 Salad', description: 'Salad', category: 'food' },
  { label: '🍴 Utensils', description: 'Forks & knives', category: 'supplies' },
  { label: '🪑 Chairs', description: 'Folding chairs', category: 'outdoor' },
  { label: '🎮 Games', description: 'Board games', category: 'entertainment' },
  
  // BBQ Specific
  { label: '🍔 Burgers', description: 'Burgers & buns', category: 'food' },
  { label: '🌭 Hot dogs', description: 'Hot dogs', category: 'food' },
  { label: '🔥 Charcoal', description: 'BBQ charcoal', category: 'outdoor' },
  { label: '🥩 Meat', description: 'BBQ meat', category: 'outdoor' },
  
  // Outdoor Essentials  
  { label: '🧴 Sunscreen', description: 'Sunscreen', category: 'outdoor' },
  { label: '🦟 Bug spray', description: 'Insect repellent', category: 'outdoor' },
  
  // Party Decorations
  { label: '🎈 Balloons', description: 'Decorations', category: 'supplies' },
  { label: '🕯️ Candles', description: 'Birthday candles', category: 'supplies' },
  
  // Sports & Activities
  { label: '🏐 Volleyball', description: 'Volleyball', category: 'entertainment' },
  { label: '⚽ Soccer ball', description: 'Soccer ball', category: 'entertainment' },
  { label: '🃏 Cards', description: 'Playing cards', category: 'entertainment' },
  
  // Practical Items
  { label: '🩹 First aid', description: 'First aid kit', category: 'safety' },
  { label: '🔌 Extension', description: 'Extension cords', category: 'safety' },
  { label: '🧹 Cleaning', description: 'Cleaning supplies', category: 'safety' },
  { label: '🧻 Toilet paper', description: 'Extra TP', category: 'safety' },
  
  // Less Common
  { label: '📸 Camera', description: 'Camera/Polaroid', category: 'entertainment' },
  { label: '🥖 Bread', description: 'Bread', category: 'food' },
  { label: '🧀 Cheese', description: 'Cheese platter', category: 'food' },
  { label: '🌽 Veggies', description: 'Grilling vegetables', category: 'outdoor' },
  { label: '🛏️ Blankets', description: 'Blankets', category: 'safety' },
  { label: '⛱️ Umbrella', description: 'Sun umbrella', category: 'outdoor' },
  { label: '💡 Flashlight', description: 'Flashlights', category: 'safety' },
  
  // Least Common
  { label: '🎤 Karaoke', description: 'Karaoke setup', category: 'entertainment' },
  { label: '🧯 Lighter', description: 'Lighter fluid', category: 'outdoor' },
  { label: '🧤 Gloves', description: 'Disposable gloves', category: 'safety' },
  { label: '🚗 Parking', description: 'Parking passes', category: 'safety' },
];

const ASSIGNEE_SUGGESTIONS = [
  // Most Common
  'Anyone',
  'Host',
  'Volunteers',
  'First 5 guests',
  'Everyone',
  
  // Common Groups
  'Guys',
  'Girls',
  'Drivers',
  'Co-hosts',
  'Couples',
  
  // Practical
  'TBD',
  'Me',
  'Optional',
  'Non-drinkers',
  'Early arrivals',
  
  // Popular Roles
  'Birthday person',
  'Organizers',
  'Best friends',
  'Roommates',
  'Adults',
  
  // Teams & Groups
  'Team A',
  'Team B',
  'Group 1',
  'Group 2',
  'First 10 guests',
  
  // Event Specific (Medium)
  'Coworkers',
  'Parents',
  'Singles',
  'Neighbors',
  'Us',
  
  // Skills Based
  'DD (Designated Driver)',
  'Chefs',
  'Musicians',
  'Photographers',
  'Bartenders',
  
  // Less Common
  'Locals',
  'Out-of-towners',
  '21+',
  'Kids',
  'Guest of honor',
  
  // Specific Events
  'Graduates',
  'Wedding party',
  'Groomsmen',
  'Bridesmaids',
  'Alumni',
  
  // Time Based
  'Last to arrive',
  'Weekend crew',
  'Early birds',
  'Night owls',
  'Morning shift',
  
  // Teams (Less Common)
  'Red team',
  'Blue team',
  'Table 1',
  'Table 2',
  'Classmates',
  
  // Transportation
  'Uber riders',
  'Carpoolers',
  'Walking distance',
  'Evening shift',
  'Teammates',
  
  // Specialized
  'DJs',
  'Gamers',
  'Athletes',
  'Club members',
  'VIPs',
  
  // Fun/Rare
  'Newbies',
  'Veterans',
  'Plus ones',
  'Winners',
  'Losers of last game',
  'Party animals',
];

export default function ItemsToBringModal({
  visible,
  onClose,
  onSave,
}: ItemsToBringModalProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [selectedType, setSelectedType] = useState<ItemType>('suggested');
  const [settings, setSettings] = useState<BringSettings>({
    allowGuestSuggestions: true,
    requireSignup: false,
    showQuantities: true,
  });
  const [showSuggestions, setShowSuggestions] = useState(true);

  const addItem = (itemName?: string) => {
    const name = itemName || newItemName.trim();
    if (name) {
      const newItem: Item = {
        id: Date.now().toString(),
        name: name,
        assignee: '',
        showQuantity: false,
        showAssignee: false,
        type: selectedType,
      };
      setItems([...items, newItem]);
      setNewItemName('');
    }
  };

  const selectSuggestion = (suggestion: typeof QUICK_ADD_SUGGESTIONS[0]) => {
    setNewItemName(suggestion.description);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateAssignee = (id: string, assignee: string) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, assignee } : item
    ));
  };

  const updateQuantity = (id: string, quantity: string) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, quantity } : item
    ));
  };

  const toggleQuantityField = (id: string) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, showQuantity: !item.showQuantity } : item
    ));
  };

  const toggleAssigneeField = (id: string) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, showAssignee: !item.showAssignee } : item
    ));
  };

  const updateItemType = (id: string, type: ItemType) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, type } : item
    ));
  };

  const handleSave = () => {
    onSave(items, settings);
    onClose();
  };

  const renderItem = ({ item }: { item: Item }) => {
    const typeConfig = ITEM_TYPE_CONFIG[item.type || 'suggested'];
    
    return (
      <View style={[styles.itemCard, { borderLeftColor: typeConfig.color }]}>
        <View style={styles.itemHeader}>
          <View style={styles.itemTitleSection}>
            <Text style={styles.itemName}>{item.name}</Text>
            <TouchableOpacity 
              style={[styles.typeBadge, { backgroundColor: typeConfig.color + '20' }]}
              onPress={() => {
                const types: ItemType[] = ['required', 'suggested', 'open'];
                const currentIndex = types.indexOf(item.type || 'suggested');
                const nextType = types[(currentIndex + 1) % types.length];
                updateItemType(item.id, nextType as ItemType);
              }}
            >
              <Ionicons 
                name={typeConfig.icon as any} 
                size={14} 
                color={typeConfig.color} 
              />
              <Text style={[styles.typeBadgeText, { color: typeConfig.color }]}>
                {typeConfig.label}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.itemActions}>
            <TouchableOpacity 
              onPress={() => toggleAssigneeField(item.id)} 
              style={styles.assigneeToggle}
            >
              <Ionicons 
                name={item.showAssignee ? "person" : "person-outline"} 
                size={20} 
                color="#007AFF" 
              />
            </TouchableOpacity>
            {settings.showQuantities && (
              <TouchableOpacity 
                onPress={() => toggleQuantityField(item.id)} 
                style={styles.quantityToggle}
              >
                <Ionicons 
                  name={item.showQuantity ? "pricetag" : "pricetag-outline"} 
                  size={20} 
                  color="#007AFF" 
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              onPress={() => removeItem(item.id)} 
              style={styles.deleteButton}
            >
              <Ionicons name="trash-outline" size={20} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        </View>
        
        {(item.showAssignee || item.showQuantity) && (
          <View style={styles.itemDetails}>
            {item.showAssignee && (
              <View style={[styles.assigneeContainer, !item.showQuantity && styles.assigneeContainerFull]}>
                <TextInput
                  style={styles.assigneeInput}
                  value={item.assignee}
                  onChangeText={(text) => updateAssignee(item.id, text)}
                  placeholder={settings.requireSignup ? "Assigned to... (optional)" : "Who's bringing this? (optional)"}
                  placeholderTextColor="#999"
                />
                {item.assignee === '' && (
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.assigneeSuggestionsScroll}
                    contentContainerStyle={styles.assigneeSuggestionsContent}
                  >
                    {ASSIGNEE_SUGGESTIONS.map((suggestion, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.assigneeSuggestionPill}
                        onPress={() => updateAssignee(item.id, suggestion)}
                      >
                        <Text style={styles.assigneeSuggestionText}>{suggestion}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
            )}
            
            {item.showQuantity && settings.showQuantities && (
              <TextInput
                style={styles.quantityInput}
                value={item.quantity}
                onChangeText={(text) => updateQuantity(item.id, text)}
                placeholder="Quantity"
                placeholderTextColor="#999"
                keyboardType="default"
              />
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <BottomModal
      visible={visible}
      onClose={onClose}
      title="Items to Bring"
      height={700}
      onSave={handleSave}
      saveButtonText="Save Settings"
    >
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Settings Section */}
          <View style={styles.settingsSection}>
            <Text style={styles.sectionTitle}>Settings</Text>
            
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Allow guest suggestions</Text>
                <Text style={styles.settingDescription}>
                  Guests can propose items to bring
                </Text>
              </View>
              <Switch
                value={settings.allowGuestSuggestions}
                onValueChange={(value) => 
                  setSettings({...settings, allowGuestSuggestions: value})
                }
                trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
                thumbColor="#FFF"
              />
            </View>
            
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Require sign-up</Text>
                <Text style={styles.settingDescription}>
                  Guests must claim items before event
                </Text>
              </View>
              <Switch
                value={settings.requireSignup}
                onValueChange={(value) => 
                  setSettings({...settings, requireSignup: value})
                }
                trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
                thumbColor="#FFF"
              />
            </View>
            
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Show quantities</Text>
                <Text style={styles.settingDescription}>
                  Enable quantity fields for items
                </Text>
              </View>
              <Switch
                value={settings.showQuantities}
                onValueChange={(value) => 
                  setSettings({...settings, showQuantities: value})
                }
                trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
                thumbColor="#FFF"
              />
            </View>
          </View>

          {/* Add Item Section */}
          <View style={styles.addItemSection}>
            <Text style={styles.sectionTitle}>Add Items</Text>
            
            {/* Type Selector */}
            <View style={styles.typeSelector}>
              {(Object.keys(ITEM_TYPE_CONFIG) as ItemType[]).map((type) => {
                const config = ITEM_TYPE_CONFIG[type];
                return (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeOption,
                      selectedType === type && styles.typeOptionActive,
                      { borderColor: selectedType === type ? config.color : '#E5E5E5' }
                    ]}
                    onPress={() => setSelectedType(type)}
                  >
                    <Ionicons 
                      name={config.icon as any} 
                      size={18} 
                      color={selectedType === type ? config.color : '#8E8E93'} 
                    />
                    <Text style={[
                      styles.typeOptionText,
                      selectedType === type && { color: config.color }
                    ]}>
                      {config.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            
            <View style={styles.addItemContainer}>
              <TextInput
                style={styles.addItemInput}
                value={newItemName}
                onChangeText={setNewItemName}
                placeholder="What should guests bring?"
                placeholderTextColor="#C7C7CC"
                onSubmitEditing={() => addItem()}
                returnKeyType="done"
                autoCapitalize="sentences"
              />
              <TouchableOpacity 
                style={[styles.addButton, !newItemName.trim() && styles.addButtonDisabled]}
                onPress={() => addItem()}
                disabled={!newItemName.trim()}
              >
                <Ionicons 
                  name="add" 
                  size={24} 
                  color="#FFF" 
                />
              </TouchableOpacity>
            </View>
            
            {/* Quick Add Suggestions */}
            {showSuggestions && (
              <View style={styles.suggestionsContainer}>
                <View style={styles.suggestionsHeader}>
                  <Text style={styles.suggestionsTitle}>Quick add</Text>
                  <TouchableOpacity onPress={() => setShowSuggestions(false)}>
                    <Ionicons name="close" size={20} color="#8E8E93" />
                  </TouchableOpacity>
                </View>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.suggestionsScroll}
                  contentContainerStyle={styles.suggestionsContent}
                >
                  {QUICK_ADD_SUGGESTIONS.map((suggestion, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.suggestionPill}
                      onPress={() => selectSuggestion(suggestion)}
                    >
                      <Text style={styles.suggestionText}>{suggestion.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Items List */}
          {items.length > 0 && (
            <View style={styles.itemsSection}>
              <View style={styles.itemsHeader}>
                <Text style={styles.sectionTitle}>Items ({items.length})</Text>
                <View style={styles.legendRow}>
                  {(Object.keys(ITEM_TYPE_CONFIG) as ItemType[]).map((type) => {
                    const config = ITEM_TYPE_CONFIG[type];
                    const count = items.filter(item => item.type === type).length;
                    if (count === 0) return null;
                    return (
                      <View key={type} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: config.color }]} />
                        <Text style={styles.legendText}>{count} {config.label.toLowerCase()}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
              
              <FlatList
                data={items}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                contentContainerStyle={styles.listContent}
              />
            </View>
          )}
          
          {items.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="basket-outline" size={48} color="#C7C7CC" />
              <Text style={styles.emptyStateText}>No items yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Start adding items that guests should bring to your event
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </BottomModal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  helperSection: {
    backgroundColor: '#F0F8FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  helperText: {
    fontSize: 14,
    color: '#007AFF',
    lineHeight: 20,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  required: {
    color: '#FF3B30',
    fontSize: 18,
  },
  settingsSection: {
    marginBottom: 32,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 18,
  },
  addItemSection: {
    marginBottom: 24,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 6,
  },
  typeOptionActive: {
    backgroundColor: '#F8F8F8',
  },
  typeOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
  },
  addItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  addItemInput: {
    flex: 1,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#000',
  },
  addButton: {
    width: 48,
    height: 48,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  itemsSection: {
    marginBottom: 20,
  },
  itemsHeader: {
    marginBottom: 16,
  },
  legendRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 13,
    color: '#8E8E93',
  },
  listContent: {
    gap: 10,
  },
  itemCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemTitleSection: {
    flex: 1,
    gap: 8,
  },
  itemName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    alignSelf: 'flex-start',
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  assigneeToggle: {
    padding: 4,
  },
  quantityToggle: {
    padding: 4,
  },
  deleteButton: {
    padding: 4,
  },
  itemDetails: {
    gap: 10,
    marginTop: 12,
  },
  assigneeContainer: {
    flex: 1,
  },
  assigneeContainerFull: {
    flex: 1,
  },
  assigneeInput: {
    backgroundColor: '#F8F8F8',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#000',
    marginBottom: 8,
  },
  assigneeSuggestionsScroll: {
    marginHorizontal: -4,
  },
  assigneeSuggestionsContent: {
    paddingHorizontal: 4,
    gap: 6,
  },
  assigneeSuggestionPill: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  assigneeSuggestionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#007AFF',
  },
  quantityInput: {
    width: 80,
    backgroundColor: '#F8F8F8',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#000',
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#C7C7CC',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  suggestionsContainer: {
    marginTop: 16,
  },
  suggestionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  suggestionsScroll: {
    marginHorizontal: -20,
  },
  suggestionsContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  suggestionPill: {
    backgroundColor: '#F8F8F8',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  suggestionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
});