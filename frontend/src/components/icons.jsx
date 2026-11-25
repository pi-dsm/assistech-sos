// Ícones do Google (Material Symbols Rounded), servidos localmente pelo pacote "material-symbols"
// para funcionar sem internet. Os nomes à esquerda são os usados nas telas; à direita, o nome do ícone
// no Google Fonts (https://fonts.google.com/icons). Uso: <Plus size={16} className="text-blue-600" />
const icon = (name) =>
  function Icon({ size = 20, className = '', style, strokeWidth, absoluteStrokeWidth, color, fill, ...rest }) {
    return (
      <span aria-hidden="true" {...rest} className={`material-symbols-rounded ${className}`} style={{ fontSize: size, width: size, height: size, color, ...style }}>
        {name}
      </span>
    );
  };

export const Activity = icon('monitoring');
export const AlertTriangle = icon('warning');
export const ArrowDownRight = icon('south_east');
export const ArrowLeft = icon('arrow_back');
export const ArrowRight = icon('arrow_forward');
export const ArrowUpRight = icon('north_east');
export const BarChart3 = icon('bar_chart');
export const Barcode = icon('barcode_scanner');
export const BellRing = icon('notifications_active');
export const Boxes = icon('inventory_2');
export const Building = icon('domain');
export const Calculator = icon('calculate');
export const CalendarCheck2 = icon('event_available');
export const CalendarClock = icon('schedule');
export const Check = icon('check');
export const CheckCircle2 = icon('check_circle');
export const ChevronDown = icon('expand_more');
export const ChevronRight = icon('chevron_right');
export const ClipboardCheck = icon('assignment_turned_in');
export const ClipboardList = icon('assignment');
export const Clock = icon('schedule');
export const Columns3 = icon('view_kanban');
export const Copy = icon('content_copy');
export const Cpu = icon('memory');
export const CreditCard = icon('credit_card');
export const Download = icon('download');
export const Eraser = icon('ink_eraser');
export const ExternalLink = icon('open_in_new');
export const Eye = icon('visibility');
export const EyeOff = icon('visibility_off');
export const FileText = icon('description');
export const Gauge = icon('speed');
export const Globe = icon('language');
export const Headphones = icon('headphones');
export const History = icon('history');
export const House = icon('home');
export const Info = icon('info');
export const KeyRound = icon('key');
export const LayoutGrid = icon('grid_view');
export const LayoutList = icon('view_list');
export const Lightbulb = icon('lightbulb');
export const List = icon('list');
export const ListOrdered = icon('format_list_numbered');
export const Lock = icon('lock');
export const LogOut = icon('logout');
export const Mail = icon('mail');
export const MapPin = icon('location_on');
export const Menu = icon('menu');
export const MessageCircle = icon('chat');
export const Mic = icon('mic');
export const MicOff = icon('mic_off');
export const Minus = icon('remove');
export const Monitor = icon('desktop_windows');
export const Moon = icon('dark_mode');
export const Package = icon('package_2');
export const PackageCheck = icon('inventory');
export const PackageX = icon('block');
export const Palette = icon('palette');
export const Pencil = icon('edit');
export const Percent = icon('percent');
export const Phone = icon('call');
export const Play = icon('play_arrow');
export const Plus = icon('add');
export const PlusCircle = icon('add_circle');
export const Power = icon('power_settings_new');
export const Printer = icon('print');
export const Receipt = icon('receipt_long');
export const RefreshCw = icon('refresh');
export const RotateCcw = icon('replay');
export const Save = icon('save');
export const Search = icon('search');
export const Settings = icon('settings');
export const ShieldAlert = icon('gpp_maybe');
export const ShieldCheck = icon('verified_user');
export const ShoppingCart = icon('shopping_cart');
export const Smartphone = icon('smartphone');
export const Sparkles = icon('auto_awesome');
export const Stethoscope = icon('stethoscope');
export const Store = icon('storefront');
export const Sun = icon('light_mode');
export const Table2 = icon('table');
export const Tags = icon('sell');
export const Target = icon('target');
export const Timer = icon('timer');
export const Trash2 = icon('delete');
export const TrendingUp = icon('trending_up');
export const TriangleAlert = icon('warning');
export const Truck = icon('local_shipping');
export const Undo2 = icon('undo');
export const UserCheck = icon('how_to_reg');
export const UserCog = icon('manage_accounts');
export const UserPlus = icon('person_add');
export const Users = icon('group');
export const Wallet = icon('account_balance_wallet');
export const Wrench = icon('build');
export const X = icon('close');
export const XCircle = icon('cancel');
