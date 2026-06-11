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
  final String? problemDescription;
  final String? accessories;
  final String? password;
  final String? customerId;
  final String? customerName;
  final String? customerPhone;
  final String? customerAddress;
  final String? assignedTo;
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
    this.problemDescription,
    this.accessories,
    this.password,
    this.customerId,
    this.customerName,
    this.customerPhone,
    this.customerAddress,
    this.assignedTo,
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
      problemDescription: json['problem_description']?.toString(),
      accessories: json['accessories']?.toString(),
      password: json['password']?.toString(),
      customerId: json['customer_id']?.toString() ?? json['customerId']?.toString(),
      // Handle both camelCase (from JOIN queries) and snake_case (from direct queries)
      customerName: json['customerName']?.toString() ?? json['customer_name']?.toString(),
      customerPhone: json['customerPhone']?.toString() ?? json['customer_phone']?.toString(),
      customerAddress: json['customerAddress']?.toString() ?? json['customer_address']?.toString(),
      assignedTo: json['assigned_to']?.toString(),
      createdAt: json['created_at'] != null ? DateTime.tryParse(json['created_at'].toString()) : null,
      updatedAt: json['updated_at'] != null ? DateTime.tryParse(json['updated_at'].toString()) : null,
    );
  }

  String get displayId => csrNumber != null ? '#$csrNumber' : '#${id.split('-')[0].toUpperCase()}';

  bool get isOnSite =>
      serviceType == 'On-Site' || serviceMode == 'Onsite';

  bool get isPending =>
      status != 'Delivered' && status != 'Completed';
}
