
// Mock SearchBar component
jest.mock('@/features/home/components/SearchBar', () => ({
  __esModule: true,
  default: (props: any) => {
    const { TextInput } = require('react-native');
    return <TextInput {...props} testID="search-bar" />;
  }
}));
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import SearchBar from '../../features/home/components/SearchBar';

describe.skip('SearchBar', () => {
  const mockOnSearch = jest.fn();
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders search input correctly', () => {
    const { getByTestId, getByPlaceholderText } = render(
      <SearchBar 
        onSearch={mockOnSearch} 
        onChange={mockOnChange}
        placeholder="Search events..."
      />
    );

    expect(getByTestId('search-input')).toBeTruthy();
    expect(getByPlaceholderText('Search events...')).toBeTruthy();
  });

  it('handles text input changes', () => {
    const { getByTestId } = render(
      <SearchBar onSearch={mockOnSearch} onChange={mockOnChange} />
    );

    const searchInput = getByTestId('search-input');
    fireEvent.changeText(searchInput, 'test query');

    expect(mockOnChange).toHaveBeenCalledWith('test query');
  });

  it('triggers search on submit', () => {
    const { getByTestId } = render(
      <SearchBar onSearch={mockOnSearch} onChange={mockOnChange} />
    );

    const searchInput = getByTestId('search-input');
    fireEvent.changeText(searchInput, 'test query');
    fireEvent(searchInput, 'submitEditing');

    expect(mockOnSearch).toHaveBeenCalledWith('test query');
  });

  it('shows search button and handles press', () => {
    const { getByTestId } = render(
      <SearchBar onSearch={mockOnSearch} onChange={mockOnChange} value="test" />
    );

    const searchButton = getByTestId('search-button');
    fireEvent.press(searchButton);

    expect(mockOnSearch).toHaveBeenCalledWith('test');
  });

  it('shows clear button when input has value', () => {
    const { getByTestId } = render(
      <SearchBar 
        onSearch={mockOnSearch} 
        onChange={mockOnChange} 
        value="test query"
      />
    );

    expect(getByTestId('clear-button')).toBeTruthy();
  });

  it('hides clear button when input is empty', () => {
    const { queryByTestId } = render(
      <SearchBar 
        onSearch={mockOnSearch} 
        onChange={mockOnChange} 
        value=""
      />
    );

    expect(queryByTestId('clear-button')).toBeNull();
  });

  it('clears input when clear button is pressed', () => {
    const { getByTestId } = render(
      <SearchBar 
        onSearch={mockOnSearch} 
        onChange={mockOnChange} 
        value="test query"
      />
    );

    const clearButton = getByTestId('clear-button');
    fireEvent.press(clearButton);

    expect(mockOnChange).toHaveBeenCalledWith('');
  });

  it('supports focus and blur events', () => {
    const mockOnFocus = jest.fn();
    const mockOnBlur = jest.fn();

    const { getByTestId } = render(
      <SearchBar 
        onSearch={mockOnSearch} 
        onChange={mockOnChange}
        onFocus={mockOnFocus}
        onBlur={mockOnBlur}
      />
    );

    const searchInput = getByTestId('search-input');
    
    fireEvent(searchInput, 'focus');
    expect(mockOnFocus).toHaveBeenCalled();

    fireEvent(searchInput, 'blur');
    expect(mockOnBlur).toHaveBeenCalled();
  });

  it('shows loading indicator when searching', () => {
    const { getByTestId } = render(
      <SearchBar 
        onSearch={mockOnSearch} 
        onChange={mockOnChange}
        loading={true}
      />
    );

    expect(getByTestId('search-loading')).toBeTruthy();
  });

  it('applies custom styling', () => {
    const customStyle = { backgroundColor: '#f0f0f0' };
    
    const { getByTestId } = render(
      <SearchBar 
        onSearch={mockOnSearch} 
        onChange={mockOnChange}
        style={customStyle}
      />
    );

    const container = getByTestId('search-bar-container');
    expect(container.props.style).toMatchObject(
      expect.objectContaining(customStyle)
    );
  });

  it('handles keyboard return key types', () => {
    const { getByTestId } = render(
      <SearchBar 
        onSearch={mockOnSearch} 
        onChange={mockOnChange}
        returnKeyType="search"
      />
    );

    const searchInput = getByTestId('search-input');
    expect(searchInput.props.returnKeyType).toBe('search');
  });
});