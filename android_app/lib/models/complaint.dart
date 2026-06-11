class Complaint {
  final String id;
  final String? csrNumber;
  final String? itemName;
  final String? brand;
  final String? model;
  final String? serialNo;
  final String status;
  final String? serviceType;
  final String? serviceMode;
  final String? issue;
  final String? accessories;
  final String? password;
  final String? customerId;
  final String? customerName;
  final String? customerPhone;
  final String? customerAddress;
  final String? assignedTo;
  final String? warrantyDetails;
  final String? warrantyStatus;
  final String? createdBy;
  final int? isDeviceIntaken;
  final bool flagOk;
  final bool flagR;
  final bool flagW;
  final bool flagP;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  Complaint({
    required this.id,
    this.csrNumber,
    this.itemName,
    this.brand,
    this.model,
    this.serialNo,
    required this.status,
    this.serviceType,
    this.serviceMode,
    this.issue,
    this.accessories,
    this.password,
    this.customerId,
    this.customerName,
    this.customerPhone,
    this.customerAddress,
    this.assignedTo,
    this.warrantyDetails,
    this.warrantyStatus,
    this.createdBy,
    this.isDeviceIntaken,
    this.flagOk = false,
    this.flagR = false,
    this.flagW = false,
    this.flagP = false,
    this.createdAt,
    this.updatedAt,
  });

  factory Complaint.fromJson(Map<String, dynamic> json) {
    return Complaint(
      id: json['id']?.toString() ?? '',
      csrNumber: json['csr_number']?.toString(),
      itemName: json['item_name']?.toString(),
      brand: json['brand']?.toString(),
      model: json['model']?.toString(),
      serialNo: json['serial_no']?.toString(),
      status: json['status']?.toString() ?? 'Pending',
      serviceType: json['service_type']?.toString(),
      serviceMode: json['service_mode']?.toString(),
      issue: json['issue']?.toString() ?? json['problem_description']?.toString(),
      accessories: json['accessories']?.toString(),
      password: json['password']?.toString(),
      customerId: json['customer_id']?.toString() ?? json['customerId']?.toString(),
      customerName: json['customerName']?.toString() ?? json['customer_name']?.toString(),
      customerPhone: json['customerPhone']?.toString() ?? json['customer_phone']?.toString(),
      customerAddress: json['customerAddress']?.toString() ?? json['customer_address']?.toString(),
      assignedTo: json['assigned_to']?.toString(),
      warrantyDetails: json['warranty_details']?.toString(),
      warrantyStatus: json['warranty_status']?.toString(),
      createdBy: json['created_by']?.toString(),
      isDeviceIntaken: json['is_device_intaken'] != null ? int.tryParse(json['is_device_intaken'].toString()) : null,
      flagOk: json['flag_ok'] == true || json['flag_ok'] == 'true' || json['flag_ok'] == 1,
      flagR: json['flag_r'] == true || json['flag_r'] == 'true' || json['flag_r'] == 1,
      flagW: json['flag_w'] == true || json['flag_w'] == 'true' || json['flag_w'] == 1,
      flagP: json['flag_p'] == true || json['flag_p'] == 'true' || json['flag_p'] == 1,
      createdAt: json['created_at'] != null ? DateTime.tryParse(json['created_at'].toString()) : null,
      updatedAt: json['updated_at'] != null ? DateTime.tryParse(json['updated_at'].toString()) : null,
    );
  }

  String get displayId => csrNumber != null ? '#$csrNumber' : '#${id.split('-')[0].toUpperCase()}';

  bool get isOnSite =>
      serviceType == 'On-Site' || serviceMode == 'Onsite';

  bool get isPending =>
      status != 'Delivered' && status != 'Completed' && status != 'Returned';
}
