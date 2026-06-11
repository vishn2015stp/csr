class UserModel {
  final String id;
  final String username;
  final String role;

  UserModel({required this.id, required this.username, required this.role});

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id']?.toString() ?? '',
      username: json['username']?.toString() ?? '',
      role: json['role']?.toString() ?? 'USER',
    );
  }

  bool get isAdmin => role == 'ADMIN';
}
