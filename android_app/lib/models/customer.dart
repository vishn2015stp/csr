class Customer {
  final String id;
  final String? name;
  final String? phone;
  final String? address;
  final String? email;
  final String? location;
  final String? serialNo;
  final String? deliveryDate;

  Customer({required this.id, this.name, this.phone, this.address, this.email, this.location, this.serialNo, this.deliveryDate});

  factory Customer.fromJson(Map<String, dynamic> json) {
    return Customer(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString(),
      phone: json['phone']?.toString(),
      address: json['address']?.toString(),
      email: json['email']?.toString(),
      location: json['location']?.toString(),
      serialNo: json['serial_no']?.toString(),
      deliveryDate: json['delivery_date']?.toString(),
    );
  }
}

class ServiceRecord {
  final String id;
  final String? complaintId;
  final String? technician;
  final String? issues;
  final String? resolutionStatus;
  final DateTime? createdAt;

  ServiceRecord({required this.id, this.complaintId, this.technician, this.issues, this.resolutionStatus, this.createdAt});

  factory ServiceRecord.fromJson(Map<String, dynamic> json) {
    return ServiceRecord(
      id: json['id']?.toString() ?? '',
      complaintId: json['complaint_id']?.toString(),
      technician: json['technician']?.toString(),
      issues: json['issues']?.toString(),
      resolutionStatus: json['resolution_status']?.toString(),
      createdAt: json['created_at'] != null ? DateTime.tryParse(json['created_at'].toString()) : null,
    );
  }
}

class StatusLog {
  final String id;
  final String? complaintId;
  final String? status;
  final String? note;
  final String? changedBy;
  final DateTime? createdAt;

  StatusLog({required this.id, this.complaintId, this.status, this.note, this.changedBy, this.createdAt});

  factory StatusLog.fromJson(Map<String, dynamic> json) {
    return StatusLog(
      id: json['id']?.toString() ?? '',
      complaintId: json['complaint_id']?.toString(),
      status: json['status']?.toString(),
      note: json['note']?.toString(),
      changedBy: json['changed_by']?.toString(),
      createdAt: json['created_at'] != null ? DateTime.tryParse(json['created_at'].toString()) : null,
    );
  }
}

class Invoice {
  final String id;
  final String? complaintId;
  final String? receiptNumber;
  final double? serviceFees;
  final double? partCosts;
  final double? total;
  final String? spares;
  final String? warranty;
  final DateTime? createdAt;

  Invoice({required this.id, this.complaintId, this.receiptNumber, this.serviceFees, this.partCosts, this.total, this.spares, this.warranty, this.createdAt});

  factory Invoice.fromJson(Map<String, dynamic> json) {
    return Invoice(
      id: json['id']?.toString() ?? '',
      complaintId: json['complaint_id']?.toString(),
      receiptNumber: json['receipt_number']?.toString(),
      serviceFees: json['service_fees'] != null ? double.tryParse(json['service_fees'].toString()) : null,
      partCosts: json['part_costs'] != null ? double.tryParse(json['part_costs'].toString()) : null,
      total: json['total'] != null ? double.tryParse(json['total'].toString()) : null,
      spares: json['spares']?.toString(),
      warranty: json['warranty']?.toString(),
      createdAt: json['created_at'] != null ? DateTime.tryParse(json['created_at'].toString()) : null,
    );
  }
}
