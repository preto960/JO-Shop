import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import theme from '@theme/styles';

const Header = ({title, showBack, onBack, rightAction, rightIcon}) => {
  return (
    <View style={styles.header}>
      <View style={styles.leftContainer}>
        {showBack && (
          <TouchableOpacity
            onPress={onBack}
            style={styles.backButton}
            activeOpacity={0.7}>
            <Icon name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.rightContainer}>
        {rightAction && (
          <TouchableOpacity
            onPress={rightAction}
            style={styles.backButton}
            activeOpacity={0.7}>
            <Icon
              name={rightIcon || 'ellipsis-vertical'}
              size={24}
              color={theme.colors.text}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const SearchBar = ({value, onChangeText, placeholder = 'Buscar productos...'}) => {
  return (
    <View style={styles.searchContainer}>
      <Icon
        name="search"
        size={20}
        color={theme.colors.textSecondary}
        style={styles.searchIcon}
      />
      <View style={styles.searchInput}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textLight}
          style={styles.inputText}
          returnKeyType="search"
        />
        {value ? (
          <TouchableOpacity onPress={() => onChangeText('')}>
            <Icon name="close-circle" size={18} color={theme.colors.textLight} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

export {Header, SearchBar};
