import MUIBadge from '@mui/material/Badge';
import MUICheckbox from '@mui/material/Checkbox';
import MUITextField from '@mui/material/TextField';
import MUIFormControl from '@mui/material/FormControl';
import MUISelect from '@mui/material/Select';
import MUISwitch from '@mui/material/Switch';
import MUIButton from '@mui/material/Button';
import MUIMenuList from '@mui/material/MenuList';
import MUIMenuItem from '@mui/material/MenuItem';
import MUIListItemIcon from '@mui/material/ListItemIcon';
import MUIIconButton from '@mui/material/IconButton';
import MUITooltip from '@mui/material/Tooltip';
import MUIPopper from '@mui/material/Popper';
import { GridIconSlotsComponent, GridSlotsComponent } from '../models';
import {
  GridArrowDownwardIcon,
  GridArrowUpwardIcon,
  GridCell,
  GridSkeletonCell,
  GridCheckIcon,
  GridCloseIcon,
  GridColumnIcon,
  GridColumnsPanel,
  GridFilterAltIcon,
  GridFilterListIcon,
  GridFilterPanel,
  GridFooter,
  GridLoadingOverlay,
  GridNoRowsOverlay,
  GridPagination,
  GridPanel,
  GridPreferencesPanel,
  GridRow,
  GridSaveAltIcon,
  GridSeparatorIcon,
  GridTableRowsIcon,
  GridTripleDotsVerticalIcon,
  GridViewHeadlineIcon,
  GridViewStreamIcon,
  GridMoreVertIcon,
  GridExpandMoreIcon,
  GridKeyboardArrowRight,
  GridAddIcon,
  GridRemoveIcon,
  GridDragIcon,
  GridColumnHeaderFilterIconButton,
  GridSearchIcon,
  GridVisibilityOffIcon,
  GridViewColumnIcon,
  GridClearIcon,
  GridDeleteIcon,
  GridDeleteForeverIcon,
} from '../components';
import { GridColumnMenu } from '../components/menu/columnMenu/GridColumnMenu';
import { GridColumnUnsortedIcon } from '../components/columnHeaders/GridColumnUnsortedIcon';
import { GridNoResultsOverlay } from '../components/GridNoResultsOverlay';

const DEFAULT_GRID_ICON_SLOTS_COMPONENTS: GridIconSlotsComponent = {
  BooleanCellTrueIcon: GridCheckIcon,
  BooleanCellFalseIcon: GridCloseIcon,
  ColumnMenuIcon: GridTripleDotsVerticalIcon,
  OpenFilterButtonIcon: GridFilterListIcon,
  FilterPanelAddIcon: GridAddIcon,
  FilterPanelDeleteIcon: GridDeleteIcon,
  FilterPanelRemoveAllIcon: GridDeleteForeverIcon,
  ColumnFilteredIcon: GridFilterAltIcon,
  ColumnSelectorIcon: GridColumnIcon,
  ColumnUnsortedIcon: GridColumnUnsortedIcon,
  ColumnSortedAscendingIcon: GridArrowUpwardIcon,
  ColumnSortedDescendingIcon: GridArrowDownwardIcon,
  ColumnResizeIcon: GridSeparatorIcon,
  DensityCompactIcon: GridViewHeadlineIcon,
  DensityStandardIcon: GridTableRowsIcon,
  DensityComfortableIcon: GridViewStreamIcon,
  ExportIcon: GridSaveAltIcon,
  MoreActionsIcon: GridMoreVertIcon,
  TreeDataCollapseIcon: GridExpandMoreIcon,
  TreeDataExpandIcon: GridKeyboardArrowRight,
  GroupingCriteriaCollapseIcon: GridExpandMoreIcon,
  GroupingCriteriaExpandIcon: GridKeyboardArrowRight,
  DetailPanelExpandIcon: GridAddIcon,
  DetailPanelCollapseIcon: GridRemoveIcon,
  RowReorderIcon: GridDragIcon,
  QuickFilterIcon: GridSearchIcon,
  QuickFilterClearIcon: GridCloseIcon,
  ColumnMenuHideIcon: GridVisibilityOffIcon,
  ColumnMenuSortAscendingIcon: GridArrowUpwardIcon,
  ColumnMenuSortDescendingIcon: GridArrowDownwardIcon,
  ColumnMenuFilterIcon: GridFilterAltIcon,
  ColumnMenuManageColumnsIcon: GridViewColumnIcon,
  ColumnMenuClearIcon: GridClearIcon,
};

export const DATA_GRID_DEFAULT_SLOTS_COMPONENTS: GridSlotsComponent = {
  ...DEFAULT_GRID_ICON_SLOTS_COMPONENTS,
  BaseBadge: MUIBadge,
  BaseCheckbox: MUICheckbox,
  BaseTextField: MUITextField,
  BaseFormControl: MUIFormControl,
  BaseSelect: MUISelect,
  BaseSwitch: MUISwitch,
  BaseButton: MUIButton,
  BaseMenuList: MUIMenuList,
  BaseMenuItem: MUIMenuItem,
  BaseListItemIcon: MUIListItemIcon,
  BaseIconButton: MUIIconButton,
  BaseTooltip: MUITooltip,
  BasePopper: MUIPopper,
  Cell: GridCell,
  SkeletonCell: GridSkeletonCell,
  ColumnHeaderFilterIconButton: GridColumnHeaderFilterIconButton,
  ColumnMenu: GridColumnMenu,
  Footer: GridFooter,
  Toolbar: null,
  PreferencesPanel: GridPreferencesPanel,
  LoadingOverlay: GridLoadingOverlay,
  NoResultsOverlay: GridNoResultsOverlay,
  NoRowsOverlay: GridNoRowsOverlay,
  Pagination: GridPagination,
  FilterPanel: GridFilterPanel,
  ColumnsPanel: GridColumnsPanel,
  Panel: GridPanel,
  Row: GridRow,
};

/**
 * @internal
 * The default props to use for Material UI components.
 */
export const DATA_GRID_DEFAULT_SLOT_PROPS: Partial<
  Record<keyof GridSlotsComponent, (ownerState?: { module: string } & Record<string, any>) => any>
> = {
  BaseBadge: () => ({
    color: 'default',
  }),
  BaseMenuList: (ownerState) => {
    if (ownerState?.module === 'toolbar') {
      return {
        autoFocusItem: ownerState.open,
      };
    }
    return {
      variant: 'menu',
      autoFocusItem: true,
    };
  },
};
